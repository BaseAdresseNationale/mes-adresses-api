import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Voie } from './schema/voie.schema';

@Injectable()
export class VoieService {
  constructor(@InjectModel(Voie.name) private voieModel: Model<Voie>) {}

  async isVoieExist(
    _id: Types.ObjectId,
    _bal: Types.ObjectId = null,
  ): Promise<boolean> {
    const query = { _id, _deleted: null };
    if (_bal) {
      query['_bal'] = _bal;
    }
    const voieExist = await this.voieModel.exists(query).exec();
    return voieExist !== null;
  }
}
