import { Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Numero } from '@/modules/numeros/schema/numero.schema';
import { Voie } from '@/modules/voie/schema/voie.schema';
import { Toponyme } from '@/modules/toponyme/schema/toponyme.schema';
import { BaseLocale } from '@/modules/base_locale/schema/base_locale.schema';

@Injectable()
export class DbService {
  constructor(
    @InjectModel(Numero.name) private numeroModel: Model<Numero>,
    @InjectModel(Voie.name) private voieModel: Model<Voie>,
    @InjectModel(Toponyme.name) private toponymeModel: Model<Toponyme>,
    @InjectModel(BaseLocale.name) private baseLocaleModel: Model<BaseLocale>,
  ) {}

  public async touchNumero(numero: Numero, _updated: Date = new Date()) {
    await this.touchVoie(numero.voie, _updated);
    if (numero.toponyme) {
      await this.touchToponyme(numero.toponyme, _updated);
    }
    await this.touchBal(numero._bal, _updated);
  }

  public async touchVoie(voieId: Types.ObjectId, _updated: Date = new Date()) {
    return this.voieModel.updateOne({ _id: voieId }, { $set: { _updated } });
  }

  public async touchVoies(
    voieIds: Types.ObjectId[],
    _updated: Date = new Date(),
  ) {
    return this.voieModel.updateOne(
      { _id: { $in: voieIds } },
      { $set: { _updated } },
    );
  }

  public async touchToponyme(
    toponymeId: Types.ObjectId,
    _updated: Date = new Date(),
  ) {
    return this.toponymeModel.updateOne(
      { _id: toponymeId },
      { $set: { _updated } },
    );
  }

  public async touchToponymes(
    toponymeIds: Types.ObjectId[],
    _updated: Date = new Date(),
  ) {
    return this.toponymeModel.updateOne(
      { _id: { $in: toponymeIds } },
      { $set: { _updated } },
    );
  }

  public async touchBal(voieId: Types.ObjectId, _updated: Date = new Date()) {
    return this.baseLocaleModel.updateOne(
      { _id: voieId },
      { $set: { _updated } },
    );
  }
}
