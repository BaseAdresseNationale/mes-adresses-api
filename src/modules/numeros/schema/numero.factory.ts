import { Schema, Model } from 'mongoose';
import { Types } from 'mongoose';
import { unionBy } from 'lodash';
import { NumeroSchema, Numero } from './numero.schema';
import { Voie } from '@/modules/voie/schema/voie.schema';
import {
  calcMetaTilesNumero,
  calcMetaTilesVoie,
} from '@/lib//utils/tiles.utils';

export const NumeroSchemaFactory = (
  voieModel: Model<Voie>,
  numeroModel: Model<Numero>,
): Schema<Numero> => {
  /**
   * NumeroSchema MIDLEWARE SAVE (create)
   * UPDATE _updated AND _created FIELD OF NUMERO
   * UPDATE TILES OF NUMERO
   * UPDATE centroid AND centroidTiles OF VOIE
   */
  NumeroSchema.pre('save', async function () {
    console.log('save');
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const numero = this;
    // NUMERO
    // SET DATE NUMERO
    numero._updated = new Date();
    numero._created = new Date();
    // SET TILE NUMERO
    calcMetaTilesNumero(numero);
    // VOIE
    await updateTilesVoieWithNumero(numero.voie, numero);
  });

  /**
   * NumeroSchema MIDLEWARE UPDATE (updateOne, findOneAndUpdate)
   * UPDATE _updated FIELD OF NUMERO
   * UPDATE TILES OF NUMERO
   * UPDATE centroid AND centroidTiles OF TWO VOIE IF voie CHANGE
   * UPDATE centroid AND centroidTiles OF ONE VOIE IF positions CHANGE
   */
  NumeroSchema.pre(['updateOne', 'findOneAndUpdate'], async function () {
    console.log('update');
    const modifiedField = this.getUpdate()['$set'];
    // NUMERO
    // UPDATE NUMERO TILES
    if (modifiedField.positions) {
      calcMetaTilesNumero(modifiedField);
    }
    // UPDATE NUMERO DATE
    modifiedField._updated = new Date();
    this.setUpdate(modifiedField);

    // VOIE
    if (modifiedField.voie || modifiedField.positions) {
      // GET OLD NUMERO
      const numero: Numero = await numeroModel.findOne(this.getQuery());
      // CONSTRUCT NEW NUMERO
      const newNumero: Numero = { _id: numero._id, ...modifiedField };
      if (modifiedField.voie) {
        if (modifiedField.positions) {
          // IF VOIE CHANGE AND POSITIONS NUMERO CHANGE
          // CALC OLD VOIE WITHOUT OLD NUMERO
          // CALC NEW vOIE WITH NEW NUMERO
          updateTilesVoieWithoutNumero(numero.voie, numero);
          updateTilesVoieWithNumero(modifiedField.voie, newNumero);
        } else {
          // IF VOIE CHANGE BUT NOT POSITIONS NUMERO
          // CALC OLD VOIE WITHOUT OLD NUMERO
          // CALC NEW VOIE WITH OLD NUMERO
          updateTilesVoieWithoutNumero(numero.voie, numero);
          updateTilesVoieWithNumero(modifiedField.voie, numero);
        }
      } else if (modifiedField.positions) {
        // IF ONLY POSITIONS NUMERO CHANGE
        // CALC VOIE WITH NEW NUMERO INSTEAD OF OLD NUMERO
        updateTilesVoieReplaceNumero(numero.voie, newNumero);
      }
    }
  });

  const updateTilesVoie = async (
    voie: Voie,
    numeros: Numero[],
    withUpdated: boolean = true,
  ) => {
    calcMetaTilesVoie(voie, numeros);
    // UPDATE DATE AND TILES VOIE
    if (withUpdated) {
      voie._updated = new Date();
    }
    await voieModel.updateOne({ _id: voie._id }, { $set: voie }).exec();
  };

  const getVoieByVoieId = async (voieId: Types.ObjectId) => {
    return voieModel.findOne({ _id: voieId }).select({
      centroid: 1,
      centroidTiles: 1,
      typeNumerotation: 1,
      trace: 1,
      traceTiles: 1,
    });
  };

  const getNumerosByVoieId = async (voieId: Types.ObjectId) => {
    return numeroModel.find({ voie: voieId }).select({
      positions: 1,
    });
  };

  const updateTilesVoieWithNumero = async (
    voieId: Types.ObjectId,
    withNumero: Numero = null,
  ) => {
    // GET VOIE
    const voie: Voie = await getVoieByVoieId(voieId);
    // GET NUMEROS
    const numeros: Numero[] = await getNumerosByVoieId(voieId);

    if (withNumero) {
      numeros.push(withNumero);
    }

    updateTilesVoie(voie, numeros);
  };

  const updateTilesVoieWithoutNumero = async (
    voieId: Types.ObjectId,
    withoutNumero: Numero = null,
  ) => {
    // GET VOIE
    const voie: Voie = await getVoieByVoieId(voieId);
    // GET NUMEROS
    const numeros: Numero[] = await getNumerosByVoieId(voieId);

    if (withoutNumero) {
      numeros.filter(({ _id }) => _id !== withoutNumero._id);
    }

    updateTilesVoie(voie, numeros);
  };

  const updateTilesVoieReplaceNumero = async (
    voieId: Types.ObjectId,
    replaceNumero: Numero = null,
  ) => {
    // GET VOIE
    const voie: Voie = await getVoieByVoieId(voieId);
    // GET NUMEROS
    const numeros: Numero[] = await getNumerosByVoieId(voieId);

    if (replaceNumero) {
      unionBy([replaceNumero], numeros, '_id');
    }

    updateTilesVoie(voie, numeros);
  };

  return NumeroSchema;
};
