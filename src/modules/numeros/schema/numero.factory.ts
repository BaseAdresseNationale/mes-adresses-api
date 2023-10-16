import { Schema, Model } from 'mongoose';
import { NumeroSchema, Numero } from './numero.schema';

export const NumeroSchemaFactory = (
  voieModel: Model<Numero>,
): Schema<Numero> => {
  NumeroSchema.pre('save', async function () {
    await voieModel
      .updateOne({ _id: this.voie }, { $set: { _updated: new Date() } })
      .exec();

    this._updated = new Date();
    this._created = new Date();
  });

  return NumeroSchema;
};
