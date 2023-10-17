import { Injectable, HttpStatus, HttpException, Inject } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { InjectModel, getModelToken } from '@nestjs/mongoose';
import { Numero } from './schema/numero.schema';
import { Voie } from '@/modules/voie/schema/voie.schema';
import { Toponyme } from '@/modules/toponyme/schema/toponyme.schema';
import { UpdateNumeroDto } from './dto/update_numero.dto';
import { CreateNumeroDto } from './dto/create_numero.dto';
import { normalizeSuffixe } from './numero.utils';

@Injectable()
export class NumeroService {
  constructor(
    @Inject(getModelToken(Numero.name)) private numeroModel: Model<Numero>,
    @InjectModel(Voie.name) private voieModel: Model<Voie>,
    @InjectModel(Toponyme.name) private toponymeModel: Model<Toponyme>,
  ) {}

  public async create(
    voie: Voie,
    createNumeroDto: CreateNumeroDto,
  ): Promise<Numero> {
    // CHECK IF VOIE EXIST
    if (voie._delete) {
      throw new HttpException('Voie is archived', HttpStatus.BAD_REQUEST);
    }

    // CHECK IF TOPO EXIST
    if (
      createNumeroDto.toponyme &&
      !(await !this.isToponymeExist(createNumeroDto.toponyme))
    ) {
      throw new HttpException('Toponyme not found', HttpStatus.BAD_REQUEST);
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
      throw new HttpException('Voie not found', HttpStatus.BAD_REQUEST);
    }

    // CHECK IF TOPO EXIST
    if (
      updateNumeroDto.toponyme &&
      !(await !this.isToponymeExist(updateNumeroDto.toponyme))
    ) {
      throw new HttpException('Toponyme not found', HttpStatus.BAD_REQUEST);
    }

    // NORMALIZE SUFFIXE
    if (updateNumeroDto.suffixe) {
      updateNumeroDto.suffixe = normalizeSuffixe(updateNumeroDto.suffixe);
    }

    // UPDATE NUMERO
    const numeroUpdated: Numero = await this.numeroModel.findOneAndUpdate(
      { _id: numero._id, _deleted: null },
      { $set: updateNumeroDto },
      { returnDocument: 'after' },
    );

    return numeroUpdated;
  }

  private async isVoieExist(_id: string): Promise<boolean> {
    const voieExist = await this.voieModel
      .findOne({
        _id,
        _deleted: null,
      })
      .exec();
    return voieExist !== null;
  }

  private async isToponymeExist(_id: string): Promise<boolean> {
    const toponymeExist = await this.toponymeModel
      .findOne({
        _id,
        _deleted: null,
      })
      .exec();
    return toponymeExist !== null;
  }
}
