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
  UpdateResult,
} from 'typeorm';
import { groupBy } from 'lodash';
import * as turf from '@turf/turf';
import bbox from '@turf/bbox';
import { Feature as FeatureTurf } from '@turf/helpers';
import { BBox as BboxTurf } from '@turf/helpers';

import { TypeNumerotationEnum } from '@/shared/schemas/voie/type_numerotation.enum';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { extendWithNumeros } from '@/shared/utils/numero.utils';
import { Position } from '@/shared/entities/position.entity';
import { Numero } from '@/shared/entities/numero.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';

import { cleanNom, cleanNomAlt, getNomAltDefault } from '@/lib/utils/nom.util';
import { ExtendedVoieDTO } from '@/modules/voie/dto/extended_voie.dto';
import { UpdateVoieDTO } from '@/modules/voie/dto/update_voie.dto';
import { CreateVoieDTO } from '@/modules/voie/dto/create_voie.dto';
import { RestoreVoieDTO } from '@/modules/voie/dto/restore_voie.dto';
import { NumeroService } from '@/modules/numeros/numero.service';
import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { ToponymeService } from '@/modules/toponyme/toponyme.service';
import { CreateToponymeDTO } from '@/modules/toponyme/dto/create_toponyme.dto';

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
    const voie = await this.voiesRepository.findOne({ where });
    // Si la voie n'existe pas, on throw une erreur
    if (!voie) {
      throw new HttpException(`Voie ${voieId} not found`, HttpStatus.NOT_FOUND);
    }
    return voie;
  }

  async findMany(
    where: FindOptionsWhere<Voie> | FindOptionsWhere<Voie>[],
    select?: FindOptionsSelect<Voie>,
    relations?: FindOptionsRelations<Voie>,
  ): Promise<Voie[]> {
    return this.voiesRepository.find({ where, select, relations });
  }

  public async create(
    bal: BaseLocale,
    createVoieDto: CreateVoieDTO,
  ): Promise<Voie> {
    // Créer l'object Voie a partir du dto
    const voie: Partial<Voie> = {
      balId: bal.id,
      nom: createVoieDto.nom,
      typeNumerotation:
        createVoieDto.typeNumerotation || TypeNumerotationEnum.NUMERIQUE,
      trace: createVoieDto.trace || null,
      nomAlt: createVoieDto.nomAlt ? cleanNomAlt(createVoieDto.nomAlt) : null,
      centroid: null,
    };
    // Calculer le centroid si la trace et le type de numerotation est metrique
    if (voie.trace && voie.typeNumerotation === TypeNumerotationEnum.METRIQUE) {
      voie.centroid = turf.centroid(voie.trace)?.geometry;
    }
    // Insérer la voir dans postgres
    const voieCreated: Voie = await this.voiesRepository.create(voie);
    // Mettre a jour le updatedAt de la BAL
    await this.baseLocaleService.touch(bal.id, voieCreated.updatedAt);

    return voieCreated;
  }

  public async importMany(baseLocale: BaseLocale, rawVoies: Partial<Voie>[]) {
    // On transforme les raw en voies
    const voies: Partial<Voie>[] = rawVoies
      // On garde seulement les voies qui ont un nom
      .filter(({ nom }) => Boolean(nom))
      // On map les raw pour obtenir de vrai voies
      .map((rawVoie: Partial<Voie>) => {
        if (!rawVoie.nom) {
          return null;
        }
        return {
          id: rawVoie.id,
          balId: baseLocale.id,
          nom: cleanNom(rawVoie.nom),
          nomAlt: getNomAltDefault(rawVoie.nomAlt),
          typeNumerotation: rawVoie.typeNumerotation,
          trace: rawVoie.trace || null,
          ...(rawVoie.updatedAt ? { updatedAt: rawVoie.updatedAt } : null),
          ...(rawVoie.createdAt ? { createdAt: rawVoie.createdAt } : null),
        };
      });
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
      deletedAt: null,
    };
    const { affected }: UpdateResult = await this.voiesRepository.update(
      where,
      updateVoieDto,
    );
    // On récupère la voie modifiée
    const voieUpdated: Voie = await this.voiesRepository.findOne({ where });
    // Si la voie a été modifiée
    if (affected > 0) {
      // On met a jour le centroid de la voie si la trace a été mis a jour
      if (
        updateVoieDto.trace &&
        voieUpdated.typeNumerotation === TypeNumerotationEnum.METRIQUE
      ) {
        await this.calcCentroidWithTrace(voieUpdated);
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
      // Si une voie a bien été supprimé on met a jour le updatedAt de la Bal
      await this.baseLocaleService.touch(voie.balId);
    }
  }

  public deleteMany(where: FindOptionsWhere<Voie>): Promise<any> {
    return this.voiesRepository.delete(where);
  }

  public async softDelete(voie: Voie): Promise<Voie> {
    // On créer le where et lance le softDelete typeorm
    // Le softDelete va mettre a jour le deletedAt
    const where: FindOptionsWhere<Voie> = {
      id: voie.id,
    };
    await this.voiesRepository.softDelete({});
    // On archive également tous le numéros de la voie
    await this.numeroService.softDeleteByVoie(voie.id);
    // On met a jour le updatedAt de la BAL
    await this.baseLocaleService.touch(voie.balId);
    // On retourne la voie tout juste archivée
    return this.voiesRepository.findOne({ where });
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
      // On restaure le numéros
      await this.numeroService.restore({
        id: In(numerosIds),
      });
      // On met a jour le centroid de la voie
      this.calcCentroid(voie.id);
    }
    // On met a jour le updatedAt de la BAL
    await this.baseLocaleService.touch(voie.balId);
    // On retourne la voie restaurée
    return this.voiesRepository.findOne({ where });
  }

  public async isVoieExist(id: string, balId: string = null): Promise<boolean> {
    // On créer le where avec id et balId et lance la requète
    const where: FindOptionsWhere<Voie> = { id, deletedAt: null };
    if (balId) {
      where.balId = balId;
    }
    return this.voiesRepository.exists({ where });
  }

  public async convertToToponyme(voie: Voie): Promise<Toponyme> {
    if (!this.isVoieExist(voie.id)) {
      throw new HttpException(
        `Voie ${voie.id} is deleted`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const numerosCount: number = await this.numeroService.count({
      voieId: voie.id,
      deletedAt: null,
    });
    if (numerosCount > 0) {
      throw new HttpException(
        `Voie ${voie.id} has numero(s)`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const baseLocale = await this.baseLocaleService.findOneOrFail(voie.balId);

    // CREATE TOPONYME
    const payload: CreateToponymeDTO = {
      nom: voie.nom,
      nomAlt: voie.nomAlt,
    };
    const toponyme: Toponyme = await this.toponymeService.create(
      baseLocale,
      payload,
    );
    // DELETE VOIE
    await this.delete(voie);
    // RETURN NEW TOPONYME
    return toponyme;
  }

  public async extendVoies(voies: Voie[]): Promise<ExtendedVoieDTO[]> {
    const numeros = await this.numeroService.findMany({
      voieId: In(voies.map(({ id }) => id)),
      deletedAt: null,
    });

    const numerosByVoies = groupBy(numeros, 'voie');

    return voies.map((voie) => ({
      ...extendWithNumeros(voie, numerosByVoies[voie.id] || []),
      bbox: this.getBBOX(voie, numerosByVoies[voie.id] || []),
    }));
  }

  public async extendVoie(voie: Voie): Promise<ExtendedVoieDTO> {
    const numeros = await this.numeroService.findMany({
      voieId: voie.id,
    });

    return {
      ...extendWithNumeros(voie, numeros),
      bbox: this.getBBOX(voie, numeros),
    };
  }

  public async touch(voieId: string, updatedAt: Date = new Date()) {
    return this.voiesRepository.update({ id: voieId }, { updatedAt });
  }

  public async calcCentroid(voieId: string): Promise<void> {
    const voie: Voie = await this.findOneOrFail(voieId);
    if (voie.typeNumerotation === TypeNumerotationEnum.NUMERIQUE) {
      await this.calcCentroidWithNumeros(voieId);
    } else if (
      voie.trace &&
      voie.typeNumerotation === TypeNumerotationEnum.METRIQUE
    ) {
      await this.calcCentroidWithTrace(voie);
    }
  }

  private async calcCentroidWithNumeros(voieId: string): Promise<void> {
    const centroid = await this.numeroService.findCentroidByVoie(voieId);
    await this.voiesRepository.update({ id: voieId }, { centroid });
  }

  private async calcCentroidWithTrace(voie: Voie): Promise<void> {
    const centroid = turf.centroid(voie.trace)?.geometry;
    await this.voiesRepository.update({ id: voie.id }, { centroid });
  }

  private getBBOX(voie: Voie, numeros: Numero[]): BboxTurf {
    const allPositions: Position[] = numeros
      .filter((n) => n.positions && n.positions.length > 0)
      .reduce((acc, n) => [...acc, ...n.positions], []);

    if (allPositions.length > 0) {
      const features: FeatureTurf[] = allPositions.map(({ point }) =>
        turf.feature(point),
      );
      const featuresCollection = turf.featureCollection(features);
      return bbox(featuresCollection);
    } else if (
      voie.trace &&
      voie.typeNumerotation === TypeNumerotationEnum.NUMERIQUE
    ) {
      return bbox(voie.trace);
    }
  }
}
