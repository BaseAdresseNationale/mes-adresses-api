import { Injectable, HttpStatus, HttpException, Inject } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { InjectModel, getModelToken } from '@nestjs/mongoose';
import { omit } from 'lodash';
import { Numero } from './schema/numero.schema';
import { NumeroPopulate } from './schema/numero.populate';
import { Voie } from '@/modules/voie/schema/voie.schema';
import { Toponyme } from '@/modules/toponyme/schema/toponyme.schema';
import { BaseLocale } from '@/modules/base_locale/schema/base_locale.schema';
import { UpdateNumeroDto } from './dto/update_numero.dto';
import { CreateNumeroDto } from './dto/create_numero.dto';
import { UpdateBatchNumeroDto } from './dto/update_batch_numero.dto';

@Injectable()
export class NumeroService {
  constructor(
    @Inject(getModelToken(Numero.name)) private numeroModel: Model<Numero>,
    @InjectModel(Voie.name) private voieModel: Model<Voie>,
    @InjectModel(Toponyme.name) private toponymeModel: Model<Toponyme>,
  ) {}

  public async findAllByVoieId(voieId: Types.ObjectId): Promise<Numero[]> {
    return this.numeroModel.find({ voie: voieId, _deleted: null }).exec();
  }

  public async findAllByToponymeId(
    toponymeId: Types.ObjectId,
  ): Promise<NumeroPopulate[]> {
    const numeros: NumeroPopulate[] = await this.numeroModel
      .find({ toponyme: toponymeId, _deleted: null })
      .populate<Pick<NumeroPopulate, 'voie'>>('voie')
      .exec();

    return numeros;
  }

  public async create(
    voie: Voie,
    createNumeroDto: CreateNumeroDto,
  ): Promise<Numero> {
    // CHECK IF VOIE EXIST
    if (voie._delete) {
      throw new HttpException('Voie is archived', HttpStatus.NOT_FOUND);
    }

    // CHECK IF TOPO EXIST
    if (
      createNumeroDto.toponyme &&
      !(await !this.isToponymeExist(createNumeroDto.toponyme))
    ) {
      throw new HttpException('Toponyme not found', HttpStatus.NOT_FOUND);
    }

    // CREATE NUMERO
    const numero: Partial<Numero> = {
      _id: new Types.ObjectId(),
      _bal: voie._bal,
      commune: voie.commune,
      voie: voie._id,
      ...createNumeroDto,
    };

    const numeroCreated: Numero = await this.numeroModel.create(numero);

    return numeroCreated;
  }

  public async update(
    numero: Numero,
    updateNumeroDto: UpdateNumeroDto,
  ): Promise<Numero> {
    // CHECK IF VOIE EXIST
    if (
      updateNumeroDto.voie &&
      !(await this.isVoieExist(updateNumeroDto.voie))
    ) {
      throw new HttpException('Voie not found', HttpStatus.NOT_FOUND);
    }

    // CHECK IF TOPO EXIST
    if (
      updateNumeroDto.toponyme &&
      !(await !this.isToponymeExist(updateNumeroDto.toponyme))
    ) {
      throw new HttpException('Toponyme not found', HttpStatus.NOT_FOUND);
    }

    // UPDATE NUMERO
    const numeroUpdated: Numero = await this.numeroModel.findOneAndUpdate(
      { _id: numero._id, _deleted: null },
      { $set: updateNumeroDto },
      { returnDocument: 'after' },
    );

    return numeroUpdated;
  }

  public async updateBatch(
    baseLocale: BaseLocale,
    { numerosIds, changes }: UpdateBatchNumeroDto,
  ): Promise<any> {
    // CHECK IF VOIE EXIST (IN BAL)
    if (
      changes.voie &&
      !(await this.isVoieExist(changes.voie, baseLocale._id))
    ) {
      throw new HttpException('Voie not found', HttpStatus.NOT_FOUND);
    }

    // CHECK IF TOPO EXIST (IN BAL)
    if (
      changes.toponyme &&
      !(await !this.isToponymeExist(changes.toponyme, baseLocale._id))
    ) {
      throw new HttpException('Toponyme not found', HttpStatus.NOT_FOUND);
    }

    // CHECK REQUEST NOT EMPTY
    if (Object.keys(changes).length === 0 || numerosIds.length === 0) {
      return { changes: {}, modifiedCount: 0 };
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
      { $set: { ...batchChanges } },
    );

    return { modifiedCount, changes };
  }

  public async delete(numero: Numero) {
    await this.numeroModel.deleteOne({ _id: numero._id });
  }

  public async softDelete(numero: Numero): Promise<Numero> {
    const numeroUpdated: Numero = await this.numeroModel.findOneAndUpdate(
      { _id: numero._id },
      { $set: { _delete: new Date() } },
      { returnDocument: 'after' },
    );

    return numeroUpdated;
  }

  private async isVoieExist(
    _id: Types.ObjectId,
    _bal: Types.ObjectId = null,
  ): Promise<boolean> {
    const query = { _id, _deleted: null };
    if (_bal) {
      query['_bal'] = _bal;
    }
    const voieExist = await this.voieModel.findOne(query).exec();
    return voieExist !== null;
  }

  private async isToponymeExist(
    _id: Types.ObjectId,
    _bal: Types.ObjectId = null,
  ): Promise<boolean> {
    const query = { _id, _deleted: null };
    if (_bal) {
      query['_bal'] = _bal;
    }
    const toponymeExist = await this.toponymeModel.findOne(query).exec();
    return toponymeExist !== null;
  }
}
