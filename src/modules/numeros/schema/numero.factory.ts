import { Schema, Model } from 'mongoose';
import { Types } from 'mongoose';
import { unionBy } from 'lodash';
import { NumeroSchema, Numero } from './numero.schema';
import { Voie } from '@/modules/voie/schema/voie.schema';
import { BaseLocale } from '@/modules/base_locale/schema/base_locale.schema';
import {
  calcMetaTilesNumero,
  calcMetaTilesVoie,
} from '@/lib//utils/tiles.utils';
import { normalizeSuffixe } from '../numero.utils';

// UPDATE DATE TOPONYME

export const NumeroSchemaFactory = (
  voieModel: Model<Voie>,
  numeroModel: Model<Numero>,
  baseLocalModel: Model<BaseLocale>,
): Schema<Numero> => {
  /**
   * NumeroSchema MIDLEWARE SAVE (create)
   * UPDATE _updated AND _created FIELD OF NUMERO
   * UPDATE TILES OF NUMERO
   * UPDATE centroid AND centroidTiles OF VOIE
   */
  NumeroSchema.pre('save', async function () {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const numero = this;
    // POPULATE NUMERO BEFORE CREATE
    numero.suffixe = numero.suffixe ? normalizeSuffixe(numero.suffixe) : null;
    numero.toponyme = numero.toponyme
      ? new Types.ObjectId(numero.toponyme)
      : null;
    numero.positions = numero.positions || [];
    numero.comment = numero.comment || null;
    numero.parcelles = numero.parcelles || [];
    numero.certifie = numero.certifie || false;
    numero._updated = new Date();
    numero._created = new Date();
    numero._delete = null;
    // SET TILE NUMERO
    calcMetaTilesNumero(numero);
    // SET tiles, centroidTiles VOIE
    await updateTilesVoie(numero.voie, 'with', [numero]);
    // BAL
    await updateDateVoieAndBal(numero.voie, numero._bal);
  });

  /**
   * NumeroSchema MIDLEWARE UPDATE (updateOne, findOneAndUpdate)
   * UPDATE _updated FIELD OF NUMERO
   * UPDATE TILES OF NUMERO
   * UPDATE centroid AND centroidTiles OF TWO VOIE IF voie CHANGE
   * UPDATE centroid AND centroidTiles OF ONE VOIE IF positions CHANGE
   */
  NumeroSchema.pre(['updateOne', 'findOneAndUpdate'], async function () {
    const modifiedField = this.getUpdate()['$set'];
    // NUMERO
    // UPDATE NUMERO TILES
    if (modifiedField.positions) {
      calcMetaTilesNumero(modifiedField);
    }
    // UPDATE NUMERO DATE
    if (modifiedField.suffixe) {
      modifiedField.suffixe = normalizeSuffixe(modifiedField.suffixe);
    }
    modifiedField._updated = new Date();
    this.setUpdate(modifiedField);

    // GET OLD NUMERO
    const numero: Numero = await numeroModel.findOne(this.getQuery());
    // VOIE
    if (modifiedField.voie || modifiedField.positions) {
      // CONSTRUCT NEW NUMERO
      const newNumero: Numero = { _id: numero._id, ...modifiedField };
      if (modifiedField.voie) {
        if (modifiedField.positions) {
          // IF VOIE CHANGE AND POSITIONS NUMERO CHANGE
          // CALC OLD VOIE WITHOUT OLD NUMERO
          // CALC NEW vOIE WITH NEW NUMERO
          await updateTilesVoie(numero.voie, 'without', [numero]);
          await updateTilesVoie(modifiedField.voie, 'with', [newNumero]);
        } else {
          // IF VOIE CHANGE BUT NOT POSITIONS NUMERO
          // CALC OLD VOIE WITHOUT OLD NUMERO
          // CALC NEW VOIE WITH OLD NUMERO
          await updateTilesVoie(numero.voie, 'without', [numero]);
          await updateTilesVoie(modifiedField.voie, 'with', [numero]);
        }
      } else if (modifiedField.positions) {
        // IF ONLY POSITIONS NUMERO CHANGE
        // CALC VOIE WITH NEW NUMERO INSTEAD OF OLD NUMERO
        await updateTilesVoie(numero.voie, 'replace', [newNumero]);
      }
    }

    // BAL
    await updateDateVoieAndBal(numero.voie, numero._bal);
  });

  /**
   * NumeroSchema MIDLEWARE DELETE
   * UPDATE centroid AND centroidTiles OF VOIE
   */
  NumeroSchema.pre('deleteOne', async function () {
    // GET OLD NUMERO
    const numero: Numero = await numeroModel.findOne(this.getQuery());
    // VOIE
    await updateTilesVoie(numero.voie, 'without', [numero]);
    // BAL
    await updateDateVoieAndBal(numero.voie, numero._bal);
  });

  NumeroSchema.pre('updateMany', async function () {
    const modifiedField = this.getUpdate()['$set'];
    const numeros: Numero[] = await numeroModel.find(this.getQuery());
    const voieIds: Types.ObjectId[] = [
      ...new Set(numeros.map(({ voie }) => voie)),
    ];

    // UPDATE DATE
    modifiedField._updated = new Date();
    await voieModel
      .updateMany({ _id: { $in: voieIds } }, { _updated: new Date() })
      .exec();

    // UPDATE IF CHANGE VOIE OR DELETE
    if (modifiedField.voie || modifiedField._delete) {
      // UPDATE TILES
      const promises = [];
      if (modifiedField.voie) {
        await voieModel
          .updateOne({ _id: modifiedField.voie }, { _updated: new Date() })
          .exec();

        promises.push(updateTilesVoie(modifiedField.voie, 'with', numeros));

        for (const voieId of voieIds) {
          promises.push(updateTilesVoie(voieId, 'without', numeros));
        }
      } else {
        if (modifiedField._delete === null) {
          for (const voieId of voieIds) {
            promises.push(updateTilesVoie(voieId, 'without', numeros));
          }
        } else {
          for (const voieId of voieIds) {
            promises.push(updateTilesVoie(voieId, 'with', numeros));
          }
        }
      }
      await Promise.all(promises);
    }
  });

  NumeroSchema.pre('deleteMany', async function () {
    const numeros: Numero[] = await numeroModel.find(this.getQuery());
    const voieIds: Types.ObjectId[] = [
      ...new Set(numeros.map(({ voie }) => voie)),
    ];
    // UPDATE DATE
    await voieModel
      .updateMany({ _id: { $in: voieIds } }, { _updated: new Date() })
      .exec();
    // UPDATE TILES
    for (const voieId of voieIds) {
      await updateTilesVoie(voieId, 'without', numeros);
    }
  });

  const updateDateVoieAndBal = async (
    voieId: Types.ObjectId,
    balId: Types.ObjectId,
  ) => {
    await voieModel.updateOne({ _id: voieId }, { _updated: new Date() }).exec();
    await baseLocalModel
      .updateOne({ _id: balId }, { _updated: new Date() })
      .exec();
  };

  const updateTilesVoie = async (
    voieId: Types.ObjectId,
    action: 'with' | 'without' | 'replace' | 'none' = 'none',
    numeros: Numero[] = [],
  ) => {
    const voie: Voie = await voieModel.findOne({ _id: voieId }).select({
      centroid: 1,
      centroidTiles: 1,
      typeNumerotation: 1,
      trace: 1,
      traceTiles: 1,
    });
    // GET NUMEROS
    let numerosVoie: Numero[] = await numeroModel
      .find({ voie: voieId })
      .select({
        positions: 1,
      });

    if (action === 'with') {
      numerosVoie.push(...numeros);
    } else if (action === 'without') {
      const numerosIds = numeros.map(({ _id }) => _id.toString());
      numerosVoie = numerosVoie.filter(
        ({ _id }) => !numerosIds.includes(_id.toString()),
      );
    } else if (action === 'replace') {
      numerosVoie = unionBy(numeros, numerosVoie, '_id');
    }

    calcMetaTilesVoie(voie, numerosVoie);
    // UPDATE DATE AND TILES VOIE
    await voieModel.updateOne({ _id: voie._id }, { $set: voie }).exec();
  };

  return NumeroSchema;
};
