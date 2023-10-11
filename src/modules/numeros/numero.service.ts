import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Numero } from './schema/numero.schema';
import { Voie } from '@/modules/voie/schema/voie.schema';
import { Toponyme } from '@/modules/toponyme/schema/toponyme.schema';
import { UpdateNumeroDto } from './dto/update_numero.dto';
import { TilesService } from '@/lib/services/tiles.service';

@Injectable()
export class NumeroService {
  constructor(
    private tilesService: TilesService,
    @InjectModel(Numero.name) private numeroModel: Model<Numero>,
    @InjectModel(Voie.name) private voieModel: Model<Voie>,
    @InjectModel(Toponyme.name) private toponymeModel: Model<Toponyme>,
  ) {}

  public async update(
    numero: Numero,
    updateNumeroDto: UpdateNumeroDto,
  ): Promise<Numero> {
    console.log('UPDATE', updateNumeroDto);

    // CHECK IF VOIE EXIST
    if (
      updateNumeroDto.voie &&
      (await !this.isVoieExist(updateNumeroDto.voie))
    ) {
      throw new Error('Voie not found');
    }

    // CHECK IF TOPO EXIST
    if (
      updateNumeroDto.toponyme &&
      (await !this.isToponymeExist(updateNumeroDto.toponyme))
    ) {
      throw new Error('Toponyme not found');
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
    const value = await this.numeroModel.findOneAndUpdate(
      { _id: numero._id, _deleted: null },
      { $set: updateNumeroDto },
      { returnDocument: 'after' },
    );

    console.log(value);

    // if (!value) {
    //   throw new Error('Numero not found');
    // }

    // // UPDATE TILES OF VOIE IF POSITION CHANGE
    // if (value.voie.toHexString() !== originalNumero.voie.toHexString()) {
    //   await updateVoiesTile([value.voie, originalNumero.voie]);
    // } else if (numeroChanges.positions) {
    //   await updateVoiesTile([value.voie]);
    // }

    return value;
  }

  private async isVoieExist(_id: string): Promise<boolean> {
    const voieExist = await this.voieModel
      .find({
        _id,
        _deleted: null,
      })
      .exec();
    return voieExist.length > 0;
  }

  private async isToponymeExist(_id: string): Promise<boolean> {
    const toponymeExist = await this.toponymeModel
      .find({
        _id,
        _deleted: null,
      })
      .exec();
    return toponymeExist.length > 0;
  }

  private normalizeSuffixe(suffixe: string): string {
    return suffixe.toLowerCase().trim();
  }
}
