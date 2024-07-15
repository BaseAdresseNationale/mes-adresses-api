import {
  Injectable,
  HttpStatus,
  HttpException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { omit, uniq, chunk } from 'lodash';

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
import { TilesService } from '@/modules/base_locale/sub_modules/tiles/tiles.service';
import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { calcMetaTilesNumero } from '../base_locale/sub_modules/tiles/utils/tiles.utils';
import { BatchNumeroResponseDTO } from './dto/batch_numero_response.dto';
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
    // Si la voie n'existe pas, on throw une erreur
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
    return this.numerosRepository.find({ where, select, order, relations });
  }

  async findDistinct(
    where: FindOptionsWhere<Numero>,
    field: string,
  ): Promise<string[]> {
    // Get la liste distinct du field dans l'enssemble where
    return this.numerosRepository
      .createQueryBuilder()
      .select(field)
      .where(where)
      .distinctOn([field])
      .getRawMany();
  }

  public async updateMany(
    where: FindOptionsWhere<Numero>,
    update: Partial<Numero>,
  ): Promise<any> {
    return this.numerosRepository.update(where, update);
  }

  async importMany(baseLocale: BaseLocale, rawNumeros: any[]): Promise<void> {
    const numeros = rawNumeros
      .map((rawNumero) => {
        if (!rawNumero.commune || !rawNumero.voie || !rawNumero.numero) {
          return null;
        }

        const numero = {
          _bal: baseLocale.id,
          numero: rawNumero.numero,
          comment: rawNumero.comment,
          toponyme: rawNumero.toponyme,
          commune: rawNumero.commune,
          voie: rawNumero.voie,
          ...(rawNumero.suffixe && {
            suffixe: normalizeSuffixe(rawNumero.suffixe),
          }),
          positions: rawNumero.positions || [],
          parcelles: rawNumero.parcelles || [],
          certifie: rawNumero.certifie || false,
        } as Partial<Numero>;

        calcMetaTilesNumero(numero);

        if (rawNumero._updated && rawNumero._created) {
          numero.createdAt = rawNumero.createdAt;
          numero.updatedAt = rawNumero.updatedAt;
        }

        return numero;
      })
      .filter(Boolean);

    if (numeros.length === 0) {
      return;
    }

    // INSERT NUMEROS BY CHUNK OF 500
    // TO LIMIT MEMORY USAGE
    for (const numerosChunk of chunk(numeros, 500)) {
      await this.numerosRepository
        .createQueryBuilder()
        .insert()
        .into(Numero)
        .values(numerosChunk)
        .execute();
    }
    // UPDATE TILES OF VOIES
    // const voieIds: string[] = uniq(numeros.map((n) => n.voie.toString()));
    // await this.voieService.updateTiles(voieIds);
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
      createNumeroDto.toponyme &&
      !(await this.toponymeService.isToponymeExist(createNumeroDto.toponyme))
    ) {
      throw new HttpException('Toponyme not found', HttpStatus.NOT_FOUND);
    }
    // On créer l'object numéro
    const numero: Partial<Numero> = {
      balId: voie.balId,
      voieId: voie.id,
      numero: createNumeroDto.numero,
      suffixe: createNumeroDto.suffixe
        ? normalizeSuffixe(createNumeroDto.suffixe)
        : null,
      toponymeId: createNumeroDto.toponyme || null,
      positions: createNumeroDto.positions || [],
      comment: createNumeroDto.comment || null,
      parcelles: createNumeroDto.parcelles || [],
      certifie: createNumeroDto.certifie || false,
    };
    // On insert le numero dans postgres
    const numeroCreated: Numero = await this.numerosRepository.create(numero);
    // On calcule le centroid de la voie
    const centroid = await this.findCentroidByVoie(voie.id);
    await this.voieService.updateCentroid({ id: voie.id }, centroid);
    // On met a jour le updated de la voie et Bal (et toponyme)
    await this.touch(numeroCreated, numeroCreated.updatedAt);
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

    // SET SUFFIXE IF CHANGE
    if (updateNumeroDto.suffixe) {
      updateNumeroDto.suffixe = normalizeSuffixe(updateNumeroDto.suffixe);
    }

    const where: FindOptionsWhere<Numero> = {
      id: numero.id,
      deletedAt: null,
    };

    // REQUEST UPDATE NUMERO
    const { affected }: UpdateResult = await this.numerosRepository.update(
      where,
      updateNumeroDto,
    );

    const numeroUpdated: Numero = await this.numerosRepository.findOne({
      where,
    });

    if (affected > 0) {
      await this.touch(numeroUpdated, numeroUpdated.updatedAt);
      if (updateNumeroDto.voieId) {
      } else if (updateNumeroDto.positions) {
      }
    }
    // CALCULER VOIE CENTROID SI VOIE OU POSITION CHANGE

    // if (numeroUpdated) {
    //   // UPDATE TILES VOIE IF VOIE OR POSITIONS CHANGE
    //   if (updateNumeroDto.voie) {
    // await this.tilesService.updateVoiesTiles([numero.voie, numeroUpdated.voie]);
    //     await this.voieService.touch(numero.voie, numeroUpdated._updated);
    //   } else if (updateNumeroDto.positions) {
    //     await this.tilesService.updateVoiesTiles([numero.voie]);
    //   }

    //   // SET _updated VOIE, TOPONYME AND BAL
    // }

    return numeroUpdated;
  }

  public async delete(numero: Numero): Promise<void> {
    const where: FindOptionsWhere<Numero> = {
      id: numero.id,
    };
    const { affected }: DeleteResult =
      await this.numerosRepository.delete(where);
    if (affected > 0) {
      // // UPDATE TILES VOIE
      // await this.tilesService.updateVoiesTiles([numero.voie]);
      // SET _updated VOIE, TOPONYME AND BAL
      await this.touch(numero);
    }
  }

  public deleteMany(where: FindOptionsWhere<Numero>): Promise<any> {
    return this.numerosRepository.delete(where);
  }

  public async softDelete(where: FindOptionsWhere<Numero>): Promise<Numero> {
    const { affected }: UpdateResult =
      await this.numerosRepository.softDelete(where);

    const deletedNumero: Numero = await this.numerosRepository.findOne({
      where,
    });

    if (affected > 0) {
      // // UPDATE TILES VOIE
      // await this.tilesService.updateVoiesTiles([numeroUpdated.voie]);
      // SET _updated VOIE, TOPONYME AND BAL
      await this.touch(deletedNumero);
    }

    return deletedNumero;
  }

  public async restore(where: FindOptionsWhere<Numero>): Promise<Numero> {
    const { affected }: UpdateResult =
      await this.numerosRepository.restore(where);

    const restoredNumero: Numero = await this.numerosRepository.findOne({
      where,
    });

    if (affected > 0) {
      // // UPDATE TILES VOIE
      // await this.tilesService.updateVoiesTiles([numeroUpdated.voie]);
      // SET _updated VOIE, TOPONYME AND BAL
      await this.touch(restoredNumero);
    }

    return restoredNumero;
  }

  public async certifyAllNumeros(baseLocale: BaseLocale): Promise<void> {
    const where: FindOptionsWhere<Numero> = {
      balId: baseLocale.id,
      certifie: false,
      deletedAt: null,
    };

    await this.numerosRepository.update(where, { certifie: true });
    await this.baseLocaleService.touch(baseLocale.id);
  }

  public async updateBatch(
    baseLocale: BaseLocale,
    { numerosIds, changes }: UpdateBatchNumeroDTO,
  ): Promise<BatchNumeroResponseDTO> {
    if (changes.voie === null) {
      delete changes.voie;
    }

    if (changes.toponyme === null) {
      delete changes.toponyme;
    }

    const where: FindOptionsWhere<Numero> = {
      id: In(numerosIds),
      balId: baseLocale.id,
      deletedAt: null,
    };
    const voieIds: string[] = await this.findDistinct(where, 'voieId');
    const toponymeIds: string[] = await this.findDistinct(where, 'toponymeId');

    // CHECK IF VOIE EXIST (IN BAL)
    if (
      changes.voie &&
      !(await this.voieService.isVoieExist(changes.voie, baseLocale.id))
    ) {
      throw new HttpException('Voie not found', HttpStatus.NOT_FOUND);
    }
    // CHECK IF TOPO EXIST (IN BAL)
    if (
      changes.toponyme &&
      !(await this.toponymeService.isToponymeExist(
        changes.toponyme,
        baseLocale.id,
      ))
    ) {
      throw new HttpException('Toponyme not found', HttpStatus.NOT_FOUND);
    }

    // CREATE BATCH CHANGES
    const batchChanges: Partial<Numero> = {
      ...omit(changes, 'positionType'),
    };

    if (changes.positionType) {
      batchChanges['positions.0.type'] = changes.positionType;
    }

    // UPDATE NUMEROS
    const { affected }: UpdateResult = await this.numerosRepository.update(
      {
        id: In(numerosIds),
        balId: baseLocale.id,
        deletedAt: null,
      },
      batchChanges,
    );

    if (affected > 0) {
      await this.baseLocaleService.touch(baseLocale.id);
      // UPDATES VOIE DOCUMENTS
      if (voieIds.length > 0) {
        // SET _updated VOIES
        await Promise.all(
          voieIds.map((voieId) => this.voieService.touch(voieId)),
        );
      }
      if (changes.voie) {
        await this.voieService.touch(changes.voie);
        // METTRE A JOUR CENTROID DE voieIDs et changes.voie
        // UPDATE TILES OF VOIES IF VOIE OF NUMERO CHANGE
        // await this.tilesService.updateVoiesTiles([...voieIds, changes.voie]);
      }
      // UPDATE DOCUMENTS TOPONYMES
      if (toponymeIds.length > 0) {
        // SET _updated TOPONYMES
        await Promise.all(
          toponymeIds.map((toponymeId) =>
            this.toponymeService.touch(toponymeId),
          ),
        );
      }
      if (changes.toponyme) {
        await this.toponymeService.touch(changes.toponyme);
      }
    }

    return { modifiedCount: affected, changes };
  }

  public async softDeleteBatch(
    baseLocale: BaseLocale,
    { numerosIds }: DeleteBatchNumeroDTO,
  ): Promise<BatchNumeroResponseDTO> {
    const where: FindOptionsWhere<Numero> = {
      id: In(numerosIds),
      balId: baseLocale.id,
      deletedAt: null,
    };
    const voieIds: string[] = await this.findDistinct(where, 'voieId');
    const toponymeIds: string[] = await this.findDistinct(where, 'toponymeId');

    // REQUEST SOFT DELETE NUMEROS
    const { affected }: UpdateResult = await this.numerosRepository.softDelete({
      id: In(numerosIds),
      balId: baseLocale.id,
    });

    // UPDATE VOIE AND TOPONYME IF NUMEROS WERE SOFT DELETE
    if (affected > 0) {
      await this.baseLocaleService.touch(baseLocale.id);
      // SET _updated AND tiles OF VOIES
      if (voieIds.length > 0) {
        await Promise.all(
          voieIds.map((voieId) => this.voieService.touch(voieId)),
        );
        // METTRE A JOUR CENTROID DE voieIDs
        // await this.tilesService.updateVoiesTiles(voieIds);
      }
      // SET _updated OF TOPONYMES
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
    const where: FindOptionsWhere<Numero> = {
      id: In(numerosIds),
      balId: baseLocale.id,
      deletedAt: null,
    };
    const voieIds: string[] = await this.findDistinct(where, 'voieId');
    const toponymeIds: string[] = await this.findDistinct(where, 'toponymeId');

    // REQUEST DELETE NUMEROS
    const { affected }: DeleteResult = await this.numerosRepository.delete({
      id: In(numerosIds),
      balId: baseLocale.id,
    });

    // UPDATE VOIE AND TOPONYME IF NUMEROS WERE SOFT DELETE
    if (affected > 0) {
      await this.baseLocaleService.touch(baseLocale.id);
      // SET _updated AND tiles OF VOIES
      if (voieIds.length > 0) {
        await Promise.all(
          voieIds.map((voieId) => this.voieService.touch(voieId)),
        );
        // METTRE A JOUR CENTROID DE voieIDs
        // await this.tilesService.updateVoiesTiles(voieIds);
      }
      // SET _updated OF TOPONYMES
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

  public async findCentroidByNumeros(numeroIds: string[]) {
    return this.numerosRepository
      .createQueryBuilder()
      .select('st_centroid(st_union(positions.point))')
      .leftJoin('numeros.positions', 'positions')
      .where('numeros.id IN(:...numeroIds)', { numeroIds })
      .execute();
  }

  public async findCentroidByVoie(voieId: string) {
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
