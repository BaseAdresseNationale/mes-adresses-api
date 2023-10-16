import { Injectable, HttpStatus, HttpException, Inject } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { InjectModel, getModelToken } from '@nestjs/mongoose';
import { Numero } from './schema/numero.schema';
import { Voie } from '@/modules/voie/schema/voie.schema';
import { Toponyme } from '@/modules/toponyme/schema/toponyme.schema';
import { UpdateNumeroDto } from './dto/update_numero.dto';
import { CreateNumeroDto } from './dto/create_numero.dto';
import { TilesService } from '@/lib/services/tiles.service';

@Injectable()
export class NumeroService {
  constructor(
    private tilesService: TilesService,
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
        ? this.normalizeSuffixe(createNumeroDto.suffixe)
        : null,
      toponyme: createNumeroDto.toponyme
        ? new Types.ObjectId(createNumeroDto.toponyme)
        : null,
      positions: createNumeroDto.positions || [],
      comment: createNumeroDto.comment || null,
      parcelles: createNumeroDto.parcelles || [],
      certifie: createNumeroDto.certifie || false,
    };
    // // ADD TILE TO NUMERO
    // this.tilesService.calcMetaTilesNumero(numero);
    // CREATE NUMERO
    const numeroCreated: Numero = await this.numeroModel.create(numero);
    // // UPDATE TILES OF VOIE
    // await this.tilesService.updateVoieTile(voie);

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
      updateNumeroDto.suffixe = this.normalizeSuffixe(updateNumeroDto.suffixe);
    }

    // ADD TILE TO NUMERO IF POSITIONS CHANGE
    if (updateNumeroDto.positions) {
      this.tilesService.calcMetaTilesNumero(updateNumeroDto);
    }

    // UPDATE NUMERO
    const numeroUpdated = await this.numeroModel.findOneAndUpdate(
      { _id: numero._id, _deleted: null },
      { $set: updateNumeroDto },
      { returnDocument: 'after' },
    );

    if (!numeroUpdated) {
      throw new HttpException('Numero not found', HttpStatus.BAD_REQUEST);
    }

    // UPDATE TILES OF VOIE IF POSITION CHANGE
    if (numeroUpdated.voie !== numero.voie) {
      await this.tilesService.updateVoiesTile([
        numeroUpdated.voie.toHexString(),
        numero.voie.toHexString(),
      ]);
    } else if (updateNumeroDto.positions) {
      await this.tilesService.updateVoiesTile([
        numeroUpdated.voie.toHexString(),
      ]);
    }

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

  private normalizeSuffixe(suffixe: string): string {
    return suffixe.toLowerCase().trim();
  }
}
