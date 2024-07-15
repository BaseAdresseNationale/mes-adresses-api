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
    @Inject(forwardRef(() => TilesService))
    private tilesService: TilesService,
    @Inject(forwardRef(() => VoieService))
    private voieService: VoieService,
    @Inject(forwardRef(() => ToponymeService))
    private toponymeService: ToponymeService,
    @Inject(forwardRef(() => BaseLocaleService))
    private baseLocaleService: BaseLocaleService,
  ) {}

  async findOneOrFail(numeroId: string): Promise<Numero> {
    const where: FindOptionsWhere<Numero> = {
      id: numeroId,
    };
    const numero = await this.numerosRepository.findOne({ where });

    if (!numero) {
      throw new HttpException(
        `Numero ${numeroId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return numero;
  }

  public async findManyPopulateVoie(
    where: FindOptionsWhere<Numero>,
  ): Promise<Numero[]> {
    const relations: FindOptionsRelations<Numero> = {
      voie: true,
    };
    return this.numerosRepository.find({ where, relations });
  }

  async findMany(
    where: FindOptionsWhere<Numero>,
    select?: FindOptionsSelect<Numero>,
    order?: FindOptionsOrder<Numero>,
  ): Promise<Numero[]> {
    return this.numerosRepository.find({ where, select, order });
  }

  async findDistinct(
    where: FindOptionsWhere<Numero>,
    field: string,
  ): Promise<string[]> {
    return this.numerosRepository
      .createQueryBuilder()
      .select(field)
      .where(where)
      .distinct(true)
      .execute();
  }

  public async updateMany(
    where: FindOptionsWhere<Numero>,
    update: Partial<Numero>,
  ): Promise<any> {
    return this.numerosRepository.update(where, update);
  }

  public deleteMany(where: FindOptionsWhere<Numero>): Promise<any> {
    return this.numerosRepository.delete(where);
  }

  public async count(where: FindOptionsWhere<Numero>): Promise<number> {
    return this.numerosRepository.count({ where });
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
    // CHECK IF VOIE EXIST
    if (voie.deletedAt) {
      throw new HttpException('Voie is archived', HttpStatus.NOT_FOUND);
    }

    // CHECK IF TOPO EXIST
    if (
      createNumeroDto.toponyme &&
      !(await this.toponymeService.isToponymeExist(createNumeroDto.toponyme))
    ) {
      throw new HttpException('Toponyme not found', HttpStatus.NOT_FOUND);
    }

    // CREATE NUMERO
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
    // SET TILES
    this.tilesService.calcMetaTilesNumero(numero);
    // REQUEST CREATE NUMERO
    const numeroCreated: Numero = await this.numerosRepository.create(numero);
    // // UPDATE TILES VOIE
    // await this.tilesService.updateVoieTiles(voie);
    // SET _updated VOIE, TOPONYME AND BAL
    await this.touch(numeroCreated, numeroCreated.updatedAt);

    return numeroCreated;
  }

  public async update(
    numero: Numero,
    updateNumeroDto: UpdateNumeroDTO,
  ): Promise<Numero> {
    // CHECK IF VOIE EXIST
    if (
      updateNumeroDto.voie &&
      !(await this.voieService.isVoieExist(updateNumeroDto.voie))
    ) {
      throw new HttpException('Voie not found', HttpStatus.NOT_FOUND);
    }

    // CHECK IF TOPO EXIST
    if (
      updateNumeroDto.toponyme &&
      !(await this.toponymeService.isToponymeExist(updateNumeroDto.toponyme))
    ) {
      throw new HttpException('Toponyme not found', HttpStatus.NOT_FOUND);
    }

    // SET TILES IF POSITIONS CHANGE
    if (updateNumeroDto.positions) {
      this.tilesService.calcMetaTilesNumero(updateNumeroDto);
    }

    // SET SUFFIXE IF CHANGE
    if (updateNumeroDto.suffixe) {
      updateNumeroDto.suffixe = normalizeSuffixe(updateNumeroDto.suffixe);
    }

    const change: Partial<Numero> = {
      numero: updateNumeroDto.numero,
      suffixe: updateNumeroDto.suffixe,
      comment: updateNumeroDto.comment,
      toponymeId: updateNumeroDto.toponyme,
      voieId: updateNumeroDto.voie,
      parcelles: updateNumeroDto.parcelles,
      certifie: updateNumeroDto.certifie,
      positions: updateNumeroDto.positions,
    };

    const where: FindOptionsWhere<Numero> = {
      id: numero.id,
      deletedAt: null,
    };

    // REQUEST UPDATE NUMERO
    const { affected }: UpdateResult = await this.numerosRepository.update(
      where,
      change,
    );

    const numeroUpdated: Numero = await this.numerosRepository.findOne({
      where,
    });

    if (affected > 0) {
      await this.touch(numeroUpdated, numeroUpdated.updatedAt);
    }
    // CALCULER VOIE CENTROID SI VOIE OU POSITION CHANGE

    // if (numeroUpdated) {
    //   // UPDATE TILES VOIE IF VOIE OR POSITIONS CHANGE
    //   if (updateNumeroDto.voie) {
    //     await this.tilesService.updateVoiesTiles([
    //       numero.voie,
    //       numeroUpdated.voie,
    //     ]);
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

  public async softDelete(numero: Numero): Promise<Numero> {
    const where: FindOptionsWhere<Numero> = {
      id: numero.id,
    };
    const { affected }: UpdateResult =
      await this.numerosRepository.softDelete(where);

    if (affected > 0) {
      // // UPDATE TILES VOIE
      // await this.tilesService.updateVoiesTiles([numeroUpdated.voie]);
      // SET _updated VOIE, TOPONYME AND BAL
      await this.touch(numero);
    }

    return this.numerosRepository.findOne({ where });
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

  async touch(numero: Numero, updatedAt: Date = new Date()) {
    if (numero.toponymeId) {
      await this.toponymeService.touch(numero.toponymeId, updatedAt);
    }
    await this.voieService.touch(numero.voieId, updatedAt);
    await this.baseLocaleService.touch(numero.balId, updatedAt);
  }
}
