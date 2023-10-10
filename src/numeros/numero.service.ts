import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Numero } from './schema/numero.schema'
import { UpdateNumeroDto } from './dto/update_numero.dto'

@Injectable()
export class NumeroService {

  constructor(
    @InjectModel(Numero.name) private numeroModel: Model<Numero>,
  ) {}

  async update(numero: Numero, updateNumeroDto: UpdateNumeroDto): Promise<Numero> {
    const res = await this.numeroModel.findByIdAndUpdate({_id: numero._id}, {suffixe: updateNumeroDto.suffixe}).exec()
    return res
  }
}
