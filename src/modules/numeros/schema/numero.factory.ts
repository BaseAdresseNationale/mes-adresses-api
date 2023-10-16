import { Schema, Model } from 'mongoose';
import { NumeroSchema, Numero } from './numero.schema';
import { TilesService } from '@/lib/services/tiles.service';

export const NumeroSchemaFactory = (
  voieModel: Model<Numero>,
  tilesService: TilesService,
): Schema<Numero> => {
  NumeroSchema.pre('save', async function () {
    const numero: Numero = this as Numero;
    // NUMERO
    numero._updated = new Date();
    numero._created = new Date();

    tilesService.calcMetaTilesNumero(numero);

    // VOIE
    await voieModel
      .updateOne({ _id: this.voie }, { $set: { _updated: new Date() } })
      .exec();
  });

  return NumeroSchema;
};
