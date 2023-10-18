import { Injectable, HttpStatus, HttpException, Inject } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { InjectModel, getModelToken } from '@nestjs/mongoose';
import { Numero } from './schema/numero.schema';
import { Voie } from '@/modules/voie/schema/voie.schema';
import { Toponyme } from '@/modules/toponyme/schema/toponyme.schema';
import { UpdateNumeroDto } from './dto/update_numero.dto';
import { CreateNumeroDto } from './dto/create_numero.dto';

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
  ): Promise<Numero[]> {
    return this.numeroModel
      .find({ toponyme: toponymeId, _deleted: null })
      .exec();
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

  public async delete(numero: Numero) {
    await this.numeroModel.deleteOne({ _id: numero._id });
  }

  public async softDelete(numero: Numero) {
    const numeroUpdated: Numero = await this.numeroModel.findOneAndUpdate(
      { _id: numero._id },
      { $set: { _delete: new Date() } },
      { returnDocument: 'after' },
    );

    return numeroUpdated;
  }

  private async isVoieExist(_id: Types.ObjectId): Promise<boolean> {
    const voieExist = await this.voieModel
      .findOne({
        _id,
        _deleted: null,
      })
      .exec();
    return voieExist !== null;
  }

  private async isToponymeExist(_id: Types.ObjectId): Promise<boolean> {
    const toponymeExist = await this.toponymeModel
      .findOne({
        _id,
        _deleted: null,
      })
      .exec();
    return toponymeExist !== null;
  }
}
