import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { BaseLocale } from './schema/base_locale.schema';
import { Model } from 'mongoose';
import { Habilitation } from '../habilitation/types/habilitation.type';

@Injectable()
export class BaseLocaleService {
  constructor(
    @InjectModel(BaseLocale.name) private baseLocaleModel: Model<BaseLocale>,
  ) {}

  findOne() {}

  createOne() {}

  async updateHabilitation(baseLocale: BaseLocale, habilitation: Habilitation) {
    await this.baseLocaleModel.updateOne(
      { _id: baseLocale._id },
      { _habilitation: habilitation._id },
    );
  }
}
