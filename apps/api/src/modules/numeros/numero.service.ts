import {
  Injectable,
  HttpStatus,
  HttpException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeleteResult,
  FindOptionsOrder,
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  In,
  Repository,
  UpdateResult,
} from 'typeorm';
import { v4 as uuid } from 'uuid';
import { omit, chunk } from 'lodash';

import { Numero } from '@/shared/entities/numero.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { normalizeSuffixe } from '@/shared/utils/numero.utils';

import { UpdateNumeroDTO } from '@/modules/numeros/dto/update_numero.dto';
import { CreateNumeroDTO } from '@/modules/numeros/dto/create_numero.dto';
import { UpdateBatchNumeroDTO } from '@/modules/numeros/dto/update_batch_numero.dto';
import { DeleteBatchNumeroDTO } from '@/modules/numeros/dto/delete_batch_numero.dto';
import { VoieService } from '@/modules/voie/voie.service';
import { ToponymeService } from '@/modules/toponyme/toponyme.service';
import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { BatchNumeroResponseDTO } from './dto/batch_numero_response.dto';

@Injectable()
export class NumeroService {
  constructor(
    @InjectRepository(Numero)
    private numerosRepository: Repository<Numero>,
    @Inject(forwardRef(() => VoieService))
    private voieService: VoieService,
    @Inject(forwardRef(() => ToponymeService))
    private toponymeService: ToponymeService,
    @Inject(forwardRef(() => BaseLocaleService))
    private baseLocaleService: BaseLocaleService,
  ) {}

  async findOneOrFail(numeroId: string): Promise<Numero> {
    // Créer le filtre where et lance la requète postgres
    const where: FindOptionsWhere<Numero> = {
      id: numeroId,
    };
    const numero = await this.numerosRepository.findOne({ where });
    // Si len numero n'existe pas, on throw une erreur
    if (!numero) {
      throw new HttpException(
        `Numero ${numeroId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    return numero;
  }

  async findMany(
    where: FindOptionsWhere<Numero>,
    select?: FindOptionsSelect<Numero>,
    order?: FindOptionsOrder<Numero>,
    relations?: FindOptionsRelations<Numero>,
  ): Promise<Numero[]> {
    // Get les numeros en fonction du where, select, order et des relations
    return this.numerosRepository.find({
      where,
      ...(select && { select }),
      ...(order && { order }),
      ...(relations && { relations }),
    });
  }

  async findDistinct(
    where: FindOptionsWhere<Numero>,
    field: string,
  ): Promise<string[]> {
    // Get la liste distinct du field dans l'enssemble where
    return this.numerosRepository
      .createQueryBuilder()
      .select(field)
      .distinctOn([field])
      .where(where)
      .getRawMany();
  }

  async findDistinctParcelles(balId: string): Promise<string[]> {
    console.log(balId);
    const res: any[] = await this.numerosRepository.query(
      `SELECT ARRAY_AGG(distinct elem) 
        FROM (select unnest(parcelles) as elem, bal_id, deleted_at from numeros) s 
        WHERE bal_id = '${balId}' AND deleted_at IS null`,
    );
    return res[0]?.array_agg;
  }

  async findManyWherePositionInBBox(
    balId: string,
    bbox: number[],
  ): Promise<Numero[]> {
    // Requète postgis qui permet de récupèré les voie dont le centroid est dans la bbox
    return this.numerosRepository
      .createQueryBuilder()
      .leftJoin('numeros.positions', 'positions')
      .where('id = :balId', { balId })
      .andWhere(
        'positions.point @ ST_MakeEnvelope(:xmin, :ymin, :xmax, :ymax, 4326)',
        {
          xmin: bbox[0],
          ymin: bbox[1],
          xmax: bbox[2],
          ymax: bbox[3],
        },
      )
      .getMany();
  }

  public async count(where: FindOptionsWhere<Numero>): Promise<number> {
    return this.numerosRepository.count({ where });
  }

  public async updateMany(
    where: FindOptionsWhere<Numero>,
    update: Partial<Numero>,
  ): Promise<any> {
    return this.numerosRepository.update(where, update);
  }

  async importMany(
    baseLocale: BaseLocale,
    rawNumeros: Partial<Numero>[],
  ): Promise<void> {
    // On transforme les raw en numeros
    const numeros = rawNumeros
      // On garde seulement les numeros qui ont une voie et un numero
      .filter(({ voie, numero }) => Boolean(voie && numero))
      .map((rawNumero) => ({
        balId: baseLocale.id,
        banId: rawNumero.banId || uuid(),
        numero: rawNumero.numero,
        comment: rawNumero.comment,
        toponyme: rawNumero.toponyme,
        voie: rawNumero.voie,
        ...(rawNumero.suffixe && {
          suffixe: normalizeSuffixe(rawNumero.suffixe),
        }),
        positions: rawNumero.positions || [],
        parcelles: rawNumero.parcelles || [],
        certifie: rawNumero.certifie || false,
        ...(rawNumero.updatedAt && { updatedAt: rawNumero.updatedAt }),
        ...(rawNumero.createdAt && { createdAt: rawNumero.createdAt }),
      }));
    // On ne retourne rien si il n'y a pas de numeros a insert
    if (numeros.length === 0) {
      return;
    }
    // On insert les numeros 500 par 500
    for (const numerosChunk of chunk(numeros, 500)) {
      await this.numerosRepository
        .createQueryBuilder()
        .insert()
        .into(Numero)
        .values(numerosChunk)
        .execute();
    }
  }

  public async create(
    voie: Voie,
    createNumeroDto: CreateNumeroDTO,
  ): Promise<Numero> {
    // On vérifie que la voie ne soit pas archivé
    if (voie.deletedAt) {
      throw new HttpException('Voie is archived', HttpStatus.NOT_FOUND);
    }
    // Si il y a un toponyme, on vérifie qu'il existe
    if (
      createNumeroDto.toponymeId &&
      !(await this.toponymeService.isToponymeExist(createNumeroDto.toponymeId))
    ) {
      throw new HttpException('Toponyme not found', HttpStatus.NOT_FOUND);
    }
    // On créer l'object numéro
    const numero: Partial<Numero> = {
      balId: voie.balId,
      banId: uuid(),
      voieId: voie.id,
      numero: createNumeroDto.numero,
      suffixe: createNumeroDto.suffixe
        ? normalizeSuffixe(createNumeroDto.suffixe)
        : null,
      toponymeId: createNumeroDto.toponymeId || null,
      positions: createNumeroDto.positions || [],
      comment: createNumeroDto.comment || null,
      parcelles: createNumeroDto.parcelles || [],
      certifie: createNumeroDto.certifie || false,
    };
    // On insert le numero dans postgres
    const numeroCreated: Numero = await this.numerosRepository.create(numero);
    // On calcule le centroid de la voie
    await this.voieService.calcCentroid(voie.id);
    // On met a jour le updatedAt de la Bal
    this.baseLocaleService.touch(numero.balId);
    return numeroCreated;
  }

  public async update(
    numero: Numero,
    updateNumeroDto: UpdateNumeroDTO,
  ): Promise<Numero> {
    // Si il y a un changement de voie, on vérifie que cette derniere existe
    if (
      updateNumeroDto.voieId &&
      !(await this.voieService.isVoieExist(updateNumeroDto.voieId))
    ) {
      throw new HttpException('Voie not found', HttpStatus.NOT_FOUND);
    }
    // Si il y a un changement de toponyme, on vérifie que ce dernier existe
    if (
      updateNumeroDto.toponymeId &&
      !(await this.toponymeService.isToponymeExist(updateNumeroDto.toponymeId))
    ) {
      throw new HttpException('Toponyme not found', HttpStatus.NOT_FOUND);
    }
    // On normalize le suffix
    if (updateNumeroDto.suffixe) {
      updateNumeroDto.suffixe = normalizeSuffixe(updateNumeroDto.suffixe);
    }
    // On créer la condition where
    const where: FindOptionsWhere<Numero> = {
      id: numero.id,
      deletedAt: null,
    };
    // On update le numéro dans postgres
    const { affected }: UpdateResult = await this.numerosRepository.update(
      where,
      updateNumeroDto,
    );
    // On récupère le nouveau numéro modifié
    const numeroUpdated: Numero = await this.numerosRepository.findOne({
      where,
    });
    // Si le numero a été modifié
    if (affected > 0) {
      if (updateNumeroDto.voieId) {
        // On recalcule le centroid de l'ancienne et la nouvelle voie si le numero a changé de voie
        await this.voieService.calcCentroid(numero.voieId);
        await this.voieService.calcCentroid(numeroUpdated.voieId);
      } else if (updateNumeroDto.positions) {
        // On recalcule le centroid de la voie si les positions du numeros on changé
        await this.voieService.calcCentroid(numero.voieId);
      }
      // On met a jour le updatedAt de la BAL
      this.baseLocaleService.touch(numero.balId);
    }

    return numeroUpdated;
  }

  public async delete(numero: Numero): Promise<void> {
    // On créer le where et on lance la requète
    const where: FindOptionsWhere<Numero> = {
      id: numero.id,
    };
    const { affected }: DeleteResult =
      await this.numerosRepository.delete(where);
    // Si le numero a été suprimé
    if (affected > 0) {
      // On met a jour le updatedAt de la bal, la voie et le toponyme
      await this.touch(numero);
    }
  }

  public async deleteMany(where: FindOptionsWhere<Numero>) {
    // On supprime les numero
    await this.numerosRepository.delete(where);
  }

  public async softDelete(where: FindOptionsWhere<Numero>): Promise<Numero> {
    // On créer le where et on lance la requète
    const { affected }: UpdateResult =
      await this.numerosRepository.softDelete(where);
    const deletedNumero: Numero = await this.numerosRepository.findOne({
      where,
    });
    // Si le numero a été suprimé
    if (affected > 0) {
      // On recalcule le centroid de la voie du numéro
      await this.voieService.calcCentroid(deletedNumero.voieId);
      // On met a jour le updatedAt de la bal, la voie et le toponyme
      await this.touch(deletedNumero);
    }

    return deletedNumero;
  }

  public async softDeleteByVoie(voieId: string): Promise<void> {
    await this.numerosRepository.softDelete({
      voieId,
    });
  }

  public async restore(where: FindOptionsWhere<Numero>): Promise<void> {
    await this.numerosRepository.restore(where);
  }

  public async toggleCertifieNumeros(
    baseLocale: BaseLocale,
    certifie: boolean,
  ): Promise<void> {
    const numeros = await this.findMany(
      { balId: baseLocale.id, certifie: !certifie, deletedAt: null },
    );
    const numerosIds = numeros.map((n) => n.id);
    await this.numerosRepository.update(
      { id: In(numerosIds) },
      { certifie },
    );
    await this.baseLocaleService.touch(baseLocale.id);
  }

  public async updateBatch(
    baseLocale: BaseLocale,
    { numerosIds, changes }: UpdateBatchNumeroDTO,
  ): Promise<BatchNumeroResponseDTO> {
    // On delete voieId et toponymeId si ils sont null
    if (changes.voieId === null) {
      delete changes.voieId;
    }
    if (changes.toponymeId === null) {
      delete changes.toponymeId;
    }
    // On récupère les différentes voies et toponymes des numeros qu'on va modifier
    const where: FindOptionsWhere<Numero> = {
      id: In(numerosIds),
      balId: baseLocale.id,
      deletedAt: null,
    };
    const voieIds: string[] = await this.findDistinct(where, 'voieId');
    const toponymeIds: string[] = await this.findDistinct(where, 'toponymeId');
    // Si la voie des numéro est changé, on vérifie que cette derniere existe bien
    if (
      changes.voieId &&
      !(await this.voieService.isVoieExist(changes.voieId, baseLocale.id))
    ) {
      throw new HttpException('Voie not found', HttpStatus.NOT_FOUND);
    }
    // Si le toponyme des numéro est changé, on vérifie que cet dernier existe bien
    if (
      changes.toponymeId &&
      !(await this.toponymeService.isToponymeExist(
        changes.toponymeId,
        baseLocale.id,
      ))
    ) {
      throw new HttpException('Toponyme not found', HttpStatus.NOT_FOUND);
    }
    // On créer le batch (en omettant positionType qui n'existe pas dans numero)
    const batchChanges: Partial<Numero> = {
      ...omit(changes, 'positionType'),
    };
    // Si le positionType est changé, on change le type de la première position dans le batch
    if (changes.positionType) {
      batchChanges['positions.0.type'] = changes.positionType;
    }
    // On lance la requète
    const { affected }: UpdateResult = await this.numerosRepository.update(
      {
        id: In(numerosIds),
        balId: baseLocale.id,
        deletedAt: null,
      },
      batchChanges,
    );
    // Si il y a plus d'un numéro qui a changé
    if (affected > 0) {
      // On met a jour le updatedAt de la BAL
      await this.baseLocaleService.touch(baseLocale.id);
      // Si la voie a changé
      if (changes.voieId) {
        // On met a jour le updatedAt de la BAL
        await this.voieService.touch(changes.voieId);
        // On recalcule tous les centroid des voie
        await Promise.all(
          voieIds.map((voieId) => this.voieService.calcCentroid(voieId)),
        );
      } else {
        // Sinon on met a jour les updatedAt des voies des numeros
        await Promise.all(
          voieIds.map((voieId) => this.voieService.touch(voieId)),
        );
      }
      // Si on change le toponyme on met a jour son updatedAt
      if (changes.toponymeId) {
        await this.toponymeService.touch(changes.toponymeId);
      }
      // Si les numeros avaient des toponyme, on met a jour leurs updatedAt
      if (toponymeIds.length > 0) {
        await Promise.all(
          toponymeIds.map((toponymeId) =>
            this.toponymeService.touch(toponymeId),
          ),
        );
      }
    }

    return { modifiedCount: affected, changes };
  }

  public async softDeleteBatch(
    baseLocale: BaseLocale,
    { numerosIds }: DeleteBatchNumeroDTO,
  ): Promise<BatchNumeroResponseDTO> {
    // On récupère les différentes voies et toponymes des numeros qu'on va modifier
    const where: FindOptionsWhere<Numero> = {
      id: In(numerosIds),
      balId: baseLocale.id,
      deletedAt: null,
    };
    const voieIds: string[] = await this.findDistinct(where, 'voieId');
    const toponymeIds: string[] = await this.findDistinct(where, 'toponymeId');
    // On archive les numeros dans postgres
    const { affected }: UpdateResult = await this.numerosRepository.softDelete({
      id: In(numerosIds),
      balId: baseLocale.id,
    });
    // Si des numeros ont été archivés
    if (affected > 0) {
      // On met a jour le updatedAt de la BAL
      await this.baseLocaleService.touch(baseLocale.id);
      // On met a jour les centroid des voies des numeros archivé
      await Promise.all(
        voieIds.map((voieId) => this.voieService.calcCentroid(voieId)),
      );
      // Si les numeros avaient des toponyme, on met a jour leurs updatedAt
      if (toponymeIds.length > 0) {
        await Promise.all(
          toponymeIds.map((toponymeId) =>
            this.toponymeService.touch(toponymeId),
          ),
        );
      }
    }

    return { modifiedCount: affected };
  }

  public async deleteBatch(
    baseLocale: BaseLocale,
    { numerosIds }: DeleteBatchNumeroDTO,
  ): Promise<any> {
    // On récupère les différentes voies et toponymes des numeros qu'on va modifier
    const where: FindOptionsWhere<Numero> = {
      id: In(numerosIds),
      balId: baseLocale.id,
      deletedAt: null,
    };
    const voieIds: string[] = await this.findDistinct(where, 'voieId');
    const toponymeIds: string[] = await this.findDistinct(where, 'toponymeId');
    // On supprime les numero dans postgres
    const { affected }: DeleteResult = await this.numerosRepository.delete({
      id: In(numerosIds),
      balId: baseLocale.id,
    });

    // Si des numeros ont été supprimé
    if (affected > 0) {
      // On met a jour le updatedAt de la BAL
      await this.baseLocaleService.touch(baseLocale.id);
      // On met a jour les updatedAt des voies des numeros archivé
      await Promise.all(
        voieIds.map((voieId) => this.voieService.touch(voieId)),
      );
      // Si les numeros avaient des toponyme, on met a jour leurs updatedAt
      if (toponymeIds.length > 0) {
        await Promise.all(
          toponymeIds.map((toponymeId) =>
            this.toponymeService.touch(toponymeId),
          ),
        );
      }
    }
    return { deletedCount: affected };
  }

  public async findCentroid(voieId: string) {
    return this.numerosRepository
      .createQueryBuilder()
      .select('st_centroid(st_union(positions.point))')
      .leftJoin('numeros.positions', 'positions')
      .where('numeros.voie_id = :voieId', { voieId })
      .execute();
  }

  async touch(numero: Numero, updatedAt: Date = new Date()) {
    if (numero.toponymeId) {
      await this.toponymeService.touch(numero.toponymeId, updatedAt);
    }
    await this.voieService.touch(numero.voieId, updatedAt);
    await this.baseLocaleService.touch(numero.balId, updatedAt);
  }
}
