import {
  Injectable,
  HttpStatus,
  HttpException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { FilterQuery, Model, ProjectionType, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { omit } from 'lodash';
import { Numero } from './schema/numero.schema';
import { NumeroPopulate } from './schema/numero.populate';
import { Voie } from '@/modules/voie/schema/voie.schema';
import { BaseLocale } from '@/modules/base_locale/schema/base_locale.schema';
import { UpdateNumeroDto } from './dto/update_numero.dto';
import { CreateNumeroDto } from './dto/create_numero.dto';
import { UpdateBatchNumeroDto } from './dto/update_batch_numero.dto';
import { DeleteBatchNumeroDto } from './dto/delete_batch_numero.dto';
import { normalizeSuffixe } from './numero.utils';
import { VoieService } from '../voie/voie.service';
import { ToponymeService } from '../toponyme/toponyme.service';
import { TilesService } from '../base_locale/sub_modules/tiles/tiles.service';
import { BaseLocaleService } from '../base_locale/base_locale.service';

@Injectable()
export class NumeroService {
  constructor(
    @InjectModel(Numero.name) private numeroModel: Model<Numero>,
    @Inject(forwardRef(() => TilesService))
    private tilesService: TilesService,
    @Inject(forwardRef(() => VoieService))
    private voieService: VoieService,
    @Inject(forwardRef(() => ToponymeService))
    private toponymeService: ToponymeService,
    @Inject(forwardRef(() => BaseLocaleService))
    private baseLocaleService: BaseLocaleService,
  ) {}

  async findOneOrFail(
    numeroId: string,
    isDelete: boolean = false,
  ): Promise<Numero> {
    const filter = {
      _id: numeroId,
      _deleted: isDelete ? { $ne: null } : null,
    };
    const numero = this.numeroModel.findOne(filter).exec();

    if (!numero) {
      throw new HttpException(
        `Numero ${numeroId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return numero;
  }

  public async findManyPopulateVoie(
    filters: FilterQuery<Numero>,
  ): Promise<NumeroPopulate[]> {
    return this.numeroModel
      .find({ ...filters, _deleted: null })
      .populate<Pick<NumeroPopulate, 'voie'>>('voie')
      .exec();
  }

  async findMany(
    filter: FilterQuery<Numero>,
    projection?: ProjectionType<Numero>,
  ): Promise<Numero[]> {
    const query = this.numeroModel.find(filter);
    if (projection) {
      query.projection(projection);
    }

    return query.exec();
  }

  public async updateMany(
    filters: FilterQuery<Numero>,
    update: Partial<Numero>,
  ): Promise<any> {
    return this.numeroModel.updateMany(filters, { $set: update });
  }

  public deleteMany(filters: FilterQuery<Numero>): Promise<any> {
    return this.numeroModel.deleteMany(filters);
  }

  public async create(
    voie: Voie,
    createNumeroDto: CreateNumeroDto,
  ): Promise<Numero> {
    // CHECK IF VOIE EXIST
    if (voie._deleted) {
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
      _id: new Types.ObjectId(),
      _bal: voie._bal,
      commune: voie.commune,
      voie: voie._id,
      numero: createNumeroDto.numero,
      suffixe: createNumeroDto.suffixe
        ? normalizeSuffixe(createNumeroDto.suffixe)
        : null,
      toponyme: createNumeroDto.toponyme
        ? new Types.ObjectId(createNumeroDto.toponyme)
        : null,
      positions: createNumeroDto.positions || [],
      comment: createNumeroDto.comment || null,
      parcelles: createNumeroDto.parcelles || [],
      certifie: createNumeroDto.certifie || false,
      _updated: new Date(),
      _created: new Date(),
      _deleted: null,
    };
    // SET TILES
    this.tilesService.calcMetaTilesNumero(numero);
    // REQUEST CREATE NUMERO
    const numeroCreated: Numero = await this.numeroModel.create(numero);
    // UPDATE TILES VOIE
    await this.tilesService.updateVoieTiles(voie);
    // SET _updated VOIE, TOPONYME AND BAL
    await this.touch(numeroCreated, numeroCreated._updated);

    return numeroCreated;
  }

  public async update(
    numero: Numero,
    updateNumeroDto: UpdateNumeroDto,
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

    // REQUEST UPDATE NUMERO
    const numeroUpdated: Numero = await this.numeroModel.findOneAndUpdate(
      { _id: numero._id, _deleted: null },
      { $set: { ...updateNumeroDto, _updated: new Date() } },
      { returnDocument: 'after' },
    );

    // UPDATE TILES VOIE IF VOIE OR POSITIONS CHANGE
    if (updateNumeroDto.voie) {
      await this.tilesService.updateVoiesTiles([
        numero.voie,
        numeroUpdated.voie,
      ]);
      await this.voieService.touch(numero.voie, numeroUpdated._updated);
    } else if (updateNumeroDto.positions) {
      await this.tilesService.updateVoiesTiles([numero.voie]);
    }

    // SET _updated VOIE, TOPONYME AND BAL
    await this.touch(numeroUpdated, numeroUpdated._updated);

    return numeroUpdated;
  }

  public async delete(numero: Numero) {
    const { deletedCount } = await this.numeroModel.deleteOne({
      _id: numero._id,
    });
    if (deletedCount >= 1) {
      // UPDATE TILES VOIE
      await this.tilesService.updateVoiesTiles([numero.voie]);
      // SET _updated VOIE, TOPONYME AND BAL
      await this.touch(numero);
    }
  }

  public async softDelete(numero: Numero): Promise<Numero> {
    const numeroUpdated: Numero = await this.numeroModel.findOneAndUpdate(
      { _id: numero._id },
      { $set: { _deleted: new Date() } },
      { returnDocument: 'after' },
    );

    // UPDATE TILES VOIE
    await this.tilesService.updateVoiesTiles([numeroUpdated.voie]);
    // SET _updated VOIE, TOPONYME AND BAL
    await this.touch(numero);

    return numeroUpdated;
  }

  public async updateBatch(
    baseLocale: BaseLocale,
    { numerosIds, changes }: UpdateBatchNumeroDto,
  ): Promise<any> {
    const { voieIds, toponymeIds } =
      await this.getDistinctVoiesAndToponymesByNumeroIds(
        numerosIds,
        baseLocale._id,
      );
    // CHECK IF VOIE EXIST (IN BAL)
    if (
      changes.voie &&
      !(await this.voieService.isVoieExist(changes.voie, baseLocale._id))
    ) {
      throw new HttpException('Voie not found', HttpStatus.NOT_FOUND);
    }
    // CHECK IF TOPO EXIST (IN BAL)
    if (
      changes.toponyme &&
      !(await this.toponymeService.isToponymeExist(
        changes.toponyme,
        baseLocale._id,
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
    const { modifiedCount } = await this.numeroModel.updateMany(
      {
        _id: { $in: numerosIds },
        _bal: baseLocale._id,
        _deleted: null,
      },
      { $set: { ...batchChanges, _updated: new Date() } },
    );

    if (modifiedCount > 0) {
      await this.baseLocaleService.touch(baseLocale._id);
      // UPDATES VOIE DOCUMENTS
      if (voieIds.length > 0) {
        // SET _updated VOIES
        await Promise.all(
          voieIds.map((voieId) => this.voieService.touch(voieId)),
        );
      }
      if (changes.voie) {
        await this.voieService.touch(changes.voie);
        // UPDATE TILES OF VOIES IF VOIE OF NUMERO CHANGE
        await this.tilesService.updateVoiesTiles([...voieIds, changes.voie]);
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

    return { modifiedCount, changes };
  }

  public async softDeleteBatch(
    baseLocale: BaseLocale,
    { numerosIds }: DeleteBatchNumeroDto,
  ): Promise<any> {
    const { voieIds, toponymeIds } =
      await this.getDistinctVoiesAndToponymesByNumeroIds(
        numerosIds,
        baseLocale._id,
      );

    // REQUEST SOFT DELETE NUMEROS
    const { modifiedCount } = await this.numeroModel.updateMany(
      {
        _id: { $in: numerosIds },
        _bal: baseLocale._id,
      },
      { $set: { _updated: new Date(), _deleted: new Date() } },
    );

    // UPDATE VOIE AND TOPONYME IF NUMEROS WERE SOFT DELETE
    if (modifiedCount > 0) {
      await this.baseLocaleService.touch(baseLocale._id);
      // SET _updated AND tiles OF VOIES
      if (voieIds.length > 0) {
        await Promise.all(
          voieIds.map((voieId) => this.voieService.touch(voieId)),
        );
        await this.tilesService.updateVoiesTiles(voieIds);
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

    return { modifiedCount };
  }

  public async deleteBatch(
    baseLocale: BaseLocale,
    { numerosIds }: DeleteBatchNumeroDto,
  ): Promise<any> {
    const { voieIds, toponymeIds } =
      await this.getDistinctVoiesAndToponymesByNumeroIds(
        numerosIds,
        baseLocale._id,
      );

    // REQUEST DELETE NUMEROS
    const { deletedCount } = await this.numeroModel.deleteMany({
      _id: { $in: numerosIds },
      _bal: baseLocale._id,
    });

    // UPDATE VOIE AND TOPONYME IF NUMEROS WERE SOFT DELETE
    if (deletedCount > 0) {
      await this.baseLocaleService.touch(baseLocale._id);
      // SET _updated AND tiles OF VOIES
      if (voieIds.length > 0) {
        await Promise.all(
          voieIds.map((voieId) => this.voieService.touch(voieId)),
        );
        await this.tilesService.updateVoiesTiles(voieIds);
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
    return { deletedCount };
  }

  private async getDistinctVoiesAndToponymesByNumeroIds(
    numeroIds: Types.ObjectId[],
    _bal: Types.ObjectId,
  ): Promise<{ voieIds: Types.ObjectId[]; toponymeIds: Types.ObjectId[] }> {
    const voieIds = (
      await this.numeroModel.distinct('voie', {
        _id: { $in: numeroIds },
        _bal,
        _deleted: null,
      })
    ).map(({ _id }) => _id);

    const toponymeIds = (
      await this.numeroModel.distinct('toponyme', {
        _id: { $in: numeroIds },
        _bal,
        _deleted: null,
      })
    ).map(({ _id }) => _id);

    return { voieIds, toponymeIds };
  }

  async touch(numero: Numero, _updated: Date = new Date()) {
    await this.voieService.touch(numero.voie, _updated);
    if (numero.toponyme) {
      await this.toponymeService.touch(numero.toponyme, _updated);
    }
    await this.baseLocaleService.touch(numero._bal, _updated);
  }
}