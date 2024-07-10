import { Schema, model, connect } from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

export enum StatusBaseLocalEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  DEMO = 'demo',
  REPLACED = 'replaced',
  READY_TO_PUBLISH = 'ready-to-publish',
}

interface EntityWithPositionI {
  _id: any;
  positions: any;
}
const entityWithPosition = new Schema<EntityWithPositionI>({
  _id: { type: Object },
  positions: { type: Object },
});

const Numero = model<EntityWithPositionI>('numeros', entityWithPosition);
const Toponyme = model<EntityWithPositionI>('toponymes', entityWithPosition);

async function run() {
  await connect(`${process.env.MONGODB_URL}/${process.env.MONGODB_DBNAME}`);

  console.log(`START`);

  let countNumero = 0;
  const cursorNumero = Numero.find({
    positions: { $elemMatch: { type: 'inconnue' } },
  }).lean();
  const totalNumero = await Numero.count({
    positions: { $elemMatch: { type: 'inconnue' } },
  });
  console.log(`START ${totalNumero} numeros`);
  for await (const entity of cursorNumero) {
    countNumero++;
    for (const position of entity.positions) {
      if (position.type === 'inconnue') {
        position.type = 'entrée';
      }
    }
    await Numero.updateOne(
      { _id: entity._id },
      { $set: { positions: entity.positions } },
    );
    if (countNumero % 10000 === 0) {
      console.log(`Upload OK, ${countNumero} / ${totalNumero} numeros`);
    }
  }

  let countToponyme = 0;
  const cursorToponyme = Toponyme.find({
    positions: { $elemMatch: { type: 'inconnue' } },
  }).lean();
  const totalToponyme = await Toponyme.count({
    positions: { $elemMatch: { type: 'inconnue' } },
  });
  console.log(`START ${totalToponyme} Toponymes`);
  for await (const entity of cursorToponyme) {
    countToponyme++;
    for (const position of entity.positions) {
      if (position.type === 'inconnue') {
        position.type = 'entrée';
      }
    }
    await Toponyme.updateOne(
      { _id: entity._id },
      { $set: { positions: entity.positions } },
    );
    if (countToponyme % 10000 === 0) {
      console.log(`Upload OK, ${countToponyme} / ${totalToponyme} Toponymes`);
    }
  }
  console.log(`END`);

  process.exit(1);
}

run().catch((err) => console.log(err));
