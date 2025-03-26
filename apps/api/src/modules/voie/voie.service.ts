import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeleteResult,
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  In,
  Repository,
  SelectQueryBuilder,
  UpdateResult,
} from 'typeorm';
import { keyBy } from 'lodash';
import * as turf from '@turf/turf';
import { v4 as uuid } from 'uuid';

import {
  BaseLocale,
  StatusBaseLocalEnum,
} from '@/shared/entities/base_locale.entity';
import { Voie, TypeNumerotationEnum } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';

import { cleanNom, cleanNomAlt, getNomAltDefault } from '@/lib/utils/nom.util';
import {
  ExtendedVoieDTO,
  VoieMetas,
} from '@/modules/voie/dto/extended_voie.dto';
import { UpdateVoieDTO } from '@/modules/voie/dto/update_voie.dto';
import { CreateVoieDTO } from '@/modules/voie/dto/create_voie.dto';
import { RestoreVoieDTO } from '@/modules/voie/dto/restore_voie.dto';
import { NumeroService } from '@/modules/numeros/numero.service';
import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { ToponymeService } from '@/modules/toponyme/toponyme.service';
import { FilaireVoieDTO } from './dto/filaire_voie.dto';
import { Numero } from '@/shared/entities/numero.entity';

@Injectable()
export class VoieService {
  constructor(
    @InjectRepository(Voie)
    private voiesRepository: Repository<Voie>,
    @Inject(forwardRef(() => BaseLocaleService))
    private baseLocaleService: BaseLocaleService,
    @Inject(forwardRef(() => NumeroService))
    private numeroService: NumeroService,
    @Inject(forwardRef(() => ToponymeService))
    private toponymeService: ToponymeService,
  ) {}

  async findOneOrFail(voieId: string): Promise<Voie> {
    // Créer le filtre where et lance la requète postgres
    const where: FindOptionsWhere<Voie> = {
      id: voieId,
    };
    const voie = await this.voiesRepository.findOne({
      where,
      withDeleted: true,
    });
    // Si la voie n'existe pas, on throw une erreur
    if (!voie) {
      throw new HttpException(`Voie ${voieId} not found`, HttpStatus.NOT_FOUND);
    }
    return voie;
  }

  async findMany(
    where: FindOptionsWhere<Voie>,
    select?: FindOptionsSelect<Voie>,
    relations?: FindOptionsRelations<Voie>,
  ): Promise<Voie[]> {
    return this.voiesRepository.find({
      where,
      ...(select && { select }),
      ...(relations && { relations }),
    });
  }

  async findManyWithDeleted(
    where: FindOptionsWhere<Voie> | FindOptionsWhere<Voie>[],
  ): Promise<Voie[]> {
    // Get les voies en fonction du where archiver ou non
    return this.voiesRepository.find({
      where,
      withDeleted: true,
    });
  }

  async findManyWhereCentroidInBBox(
    balId: string,
    bbox: number[],
  ): Promise<Voie[]> {
    // Requète postgis qui permet de récupèré les voie dont le centroid est dans la bbox
    return this.voiesRepository
      .createQueryBuilder('voies')
      .where('bal_id = :balId', { balId })
      .andWhere(
        'centroid @ ST_MakeEnvelope(:xmin, :ymin, :xmax, :ymax, 4326)',
        {
          xmin: bbox[0],
          ymin: bbox[1],
          xmax: bbox[2],
          ymax: bbox[3],
        },
      )
      .getMany();
  }

  async findManyWhereTraceInBBox(
    balId: string,
    bbox: number[],
  ): Promise<Voie[]> {
    // Requète postgis qui permet de récupèré les voie dont le centroid est dans la bbox
    return this.voiesRepository
      .createQueryBuilder()
      .where('bal_id = :balId', { balId })
      .andWhere(
        'ST_Intersects(trace, ST_MakeEnvelope(:xmin, :ymin, :xmax, :ymax, 4326) )',
        {
          xmin: bbox[0],
          ymin: bbox[1],
          xmax: bbox[2],
          ymax: bbox[3],
        },
      )
      .getMany();
  }

  public async create(
    bal: BaseLocale,
    createVoieDto: CreateVoieDTO,
  ): Promise<Voie> {
    // Créer l'object Voie a partir du dto
    const voie: Partial<Voie> = {
      balId: bal.id,
      banId: uuid(),
      nom: createVoieDto.nom,
      typeNumerotation:
        createVoieDto.typeNumerotation || TypeNumerotationEnum.NUMERIQUE,
      trace: createVoieDto.trace || null,
      nomAlt: createVoieDto.nomAlt ? cleanNomAlt(createVoieDto.nomAlt) : null,
      centroid: null,
      bbox: null,
      comment: createVoieDto.comment,
    };
    // Calculer le centroid si la trace et le type de numerotation est metrique
    if (voie.trace && voie.typeNumerotation === TypeNumerotationEnum.METRIQUE) {
      voie.centroid = turf.centroid(voie.trace)?.geometry;
    }
    // Créer l'entité typeorm
    const entityToSave: Voie = this.voiesRepository.create(voie);
    // On insert l'object dans postgres
    const voieCreated: Voie = await this.voiesRepository.save(entityToSave);
    // Mettre a jour le updatedAt de la BAL
    await this.baseLocaleService.touch(bal.id, voieCreated.updatedAt);
    // On retourne la voie créé
    return voieCreated;
  }

  public async importMany(baseLocale: BaseLocale, rawVoies: Partial<Voie>[]) {
    // On transforme les raw en voies
    const voies: Partial<Voie>[] = rawVoies
      // On garde seulement les voies qui ont un nom
      .filter(({ nom }) => Boolean(nom))
      .map((rawVoie: Partial<Voie>) => ({
        id: rawVoie.id,
        balId: baseLocale.id,
        banId: rawVoie.banId || uuid(),
        nom: cleanNom(rawVoie.nom),
        nomAlt: getNomAltDefault(rawVoie.nomAlt),
        typeNumerotation: rawVoie.typeNumerotation,
        trace: rawVoie.trace || null,
        ...(rawVoie.updatedAt && { updatedAt: rawVoie.updatedAt }),
        ...(rawVoie.createdAt && { createdAt: rawVoie.createdAt }),
      }));
    // On ne retourne rien si il n'y a pas de voies a insert
    if (voies.length === 0) {
      return;
    }
    // On insert les voies
    await this.voiesRepository
      .createQueryBuilder()
      .insert()
      .into(Voie)
      .values(voies)
      .execute();
  }

  public async update(voie: Voie, updateVoieDto: UpdateVoieDTO): Promise<Voie> {
    // Si le nom a été modifier, on le clean
    if (updateVoieDto.nom) {
      updateVoieDto.nom = cleanNom(updateVoieDto.nom);
    }
    // Si les noms alternatif on été modifier
    if (updateVoieDto.nomAlt) {
      updateVoieDto.nomAlt = cleanNomAlt(updateVoieDto.nomAlt);
    }
    // Créer le where et lancer la requète
    const where: FindOptionsWhere<Voie> = {
      id: voie.id,
    };
    const res: UpdateResult = await this.voiesRepository.update(
      where,
      updateVoieDto,
    );
    // On récupère la voie modifiée
    const voieUpdated: Voie = await this.voiesRepository.findOneBy(where);
    // Si la voie a été modifiée
    if (res.affected > 0) {
      // On met a jour le centroid de la voie si la trace a été mis a jour
      if (
        updateVoieDto.trace &&
        voieUpdated.typeNumerotation === TypeNumerotationEnum.METRIQUE
      ) {
        await this.calcCentroidAndBboxWithTrace(voieUpdated);
      }
      // On met a jour le updatedAt de la BAL
      await this.baseLocaleService.touch(
        voieUpdated.balId,
        voieUpdated.updatedAt,
      );
    }
    // On retourne la voie modifiée
    return voieUpdated;
  }

  public async delete(voie: Voie) {
    // On lance la requète postgres pour supprimer définitivement la voie
    // Les numéros sont supprimé en cascade par postgres
    const { affected }: DeleteResult = await this.voiesRepository.delete({
      id: voie.id,
    });

    if (affected >= 1) {
      // On supprime egalement les numeros de la voie
      await this.numeroService.deleteMany({ voieId: voie.id });
      // Si une voie a bien été supprimé on met a jour le updatedAt de la Bal
      await this.baseLocaleService.touch(voie.balId);
    }
  }

  public deleteMany(where: FindOptionsWhere<Voie>): Promise<any> {
    return this.voiesRepository.delete(where);
  }

  public async softDelete(voie: Voie): Promise<void> {
    // On créer le where et lance le softDelete typeorm
    // Le softDelete va mettre a jour le deletedAt
    await this.voiesRepository.softDelete({ id: voie.id });
    // On archive également tous le numéros de la voie
    await this.numeroService.softDeleteByVoie(voie.id);
    // On met a jour le updatedAt de la BAL
    await this.baseLocaleService.touch(voie.balId);
  }

  public async restore(
    voie: Voie,
    { numerosIds }: RestoreVoieDTO,
  ): Promise<Voie> {
    // On créer le where et on restore la voie
    // Le restore met a null le deletedAt de la voie
    const where: FindOptionsWhere<Voie> = {
      id: voie.id,
    };
    await this.voiesRepository.restore(where);
    // Si des numéros sont également restauré
    if (numerosIds.length > 0) {
      const where: FindOptionsWhere<Numero> = {
        id: In(numerosIds),
      };
      // On restaure le numéros
      await this.numeroService.restore(where);
      // On met a jour le centroid de la voie
      this.calcCentroidAndBbox(voie.id);
      // On clear le cache de tuile vectorielle
      const numeros = await this.numeroService.findMany(where);
      await this.numeroService.removeTileCacheFromNumeros(voie.balId, numeros);
    }
    // On met a jour le updatedAt de la BAL
    await this.baseLocaleService.touch(voie.balId);
    // On retourne la voie restaurée
    return this.voiesRepository.findOne({ where });
  }

  public async isVoieExist(id: string, balId: string = null): Promise<boolean> {
    // On créer le where avec id et balId et lance la requète
    const where: FindOptionsWhere<Voie> = {
      id,
      ...(balId && { balId }),
    };
    return this.voiesRepository.exists({ where });
  }

  public async convertToToponyme(voie: Voie): Promise<Toponyme> {
    // On lance une erreur si la voie n'existe pas
    if (!(await this.isVoieExist(voie.id))) {
      throw new HttpException(
        `Voie ${voie.id} is deleted`,
        HttpStatus.BAD_REQUEST,
      );
    }
    // On lance une erreur si la voie a des numeros
    const numerosCount: number = await this.numeroService.count({
      voieId: voie.id,
    });
    if (numerosCount > 0) {
      throw new HttpException(
        `Voie ${voie.id} has numero(s)`,
        HttpStatus.BAD_REQUEST,
      );
    }
    // On recupère la Bal
    const baseLocale = await this.baseLocaleService.findOneOrFail(voie.balId);
    // On créer un toponyme avec les noms de la voie
    const payload: Partial<Toponyme> = {
      nom: voie.nom,
      nomAlt: voie.nomAlt,
      banId: voie.banId,
    };
    const toponyme: Toponyme = await this.toponymeService.create(
      baseLocale,
      payload,
    );
    // On supprimer la voie de postgres
    await this.delete(voie);
    // On retourne le toponyme créé
    return toponyme;
  }

  public async extendVoies(
    balId: string,
    voies: Voie[],
  ): Promise<ExtendedVoieDTO[]> {
    const voiesMetas = await this.findVoiesMetas(balId);
    const voiesMetasIndex = keyBy(voiesMetas, 'id');
    return voies.map((voie) => ({ ...voie, ...voiesMetasIndex[voie.id] }));
  }

  public async touch(voieId: string, updatedAt: Date = new Date()) {
    return this.voiesRepository.update({ id: voieId }, { updatedAt });
  }

  public async calcCentroidAndBbox(voieId: string): Promise<void> {
    // On récupère la voie
    const voie: Voie = await this.findOneOrFail(voieId);
    if (voie.typeNumerotation === TypeNumerotationEnum.NUMERIQUE) {
      // On calcule la voie avec les numero si la voie est numerique
      await this.calcCentroidAndBboxWithNumeros(voieId);
    } else if (
      voie.trace &&
      voie.typeNumerotation === TypeNumerotationEnum.METRIQUE
    ) {
      // On calcul la voie avec la trace si la voie est metrique
      await this.calcCentroidAndBboxWithTrace(voie);
    }
  }

  private async calcCentroidAndBboxWithNumeros(voieId: string): Promise<void> {
    const res = await this.numeroService.findCentroidAndBboxVoie(voieId);
    if (res) {
      const { centroid, polygon } = res;
      const bbox: number[] = turf.bbox(polygon);
      await this.voiesRepository.update({ id: voieId }, { centroid, bbox });
    } else {
      await this.voiesRepository.update(
        { id: voieId },
        { centroid: null, bbox: null },
      );
    }
  }

  private async calcCentroidAndBboxWithTrace(voie: Voie): Promise<void> {
    const centroid = turf.centroid(voie.trace)?.geometry;
    const bbox = turf.bbox(voie.trace);
    await this.voiesRepository.update({ id: voie.id }, { centroid, bbox });
  }

  async getFilairesVoies(): Promise<FilaireVoieDTO[]> {
    const filaires = await this.voiesRepository
      .createQueryBuilder('voies')
      .select([
        'bal.commune as commune',
        'voies.nom as nom',
        'ST_AsGeoJSON(voies.trace) as trace',
        'voies.updatedAt as updatedAt',
        'voies.createdAt as createdAt',
      ])
      .innerJoin('voies.baseLocale', 'bal')
      .where('voies.type_numerotation = :typeNumerotation', {
        typeNumerotation: TypeNumerotationEnum.METRIQUE,
      })
      .andWhere('bal.status = :status', {
        status: StatusBaseLocalEnum.PUBLISHED,
      })
      .andWhere('voies.trace IS NOT NULL')
      .getRawMany();

    return filaires.map((f) => ({
      ...f,
      trace: JSON.parse(f.trace),
    }));
  }

  createQueryVoieMetas: SelectQueryBuilder<Voie> = this.voiesRepository
    .createQueryBuilder('voies')
    .select('voies.id', 'id')
    .addSelect('count(numeros.id)::int', 'nbNumeros')
    .addSelect(
      'count(CASE WHEN numeros.certifie THEN true END)::int',
      'nbNumerosCertifies',
    )
    .addSelect(
      'CASE WHEN count(numeros.id) > 0 AND count(CASE WHEN numeros.certifie THEN true END) = count(numeros.id) THEN true ELSE false END',
      'isAllCertified',
    )
    .addSelect('voies.comment', 'comment')
    .addSelect(
      `array_remove(array_agg(CASE WHEN numeros.comment IS NOT NULL THEN concat(numeros.numero, numeros.suffixe, ' - ', numeros.comment) END), NULL)`,
      'commentedNumeros',
    )
    .leftJoin('voies.numeros', 'numeros')
    .groupBy('voies.id, voies.comment');

  async findVoieMetas(voieId: string): Promise<VoieMetas> {
    const query = this.createQueryVoieMetas.where('voies.id = :voieId', {
      voieId,
    });
    return query.getRawOne();
  }

  async findVoiesMetas(balId: string): Promise<VoieMetas[]> {
    const query = this.createQueryVoieMetas.where('voies.bal_id = :balId', {
      balId,
    });
    return query.getRawMany();
  }
}
