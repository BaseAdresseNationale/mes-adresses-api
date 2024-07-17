import { Schema, model, connect, Types, disconnect } from 'mongoose';
import { v4 as uuid } from 'uuid';
import * as dotenv from 'dotenv';
dotenv.config();

interface IBaseLocale {
  _id: Types.ObjectId;
  banId: string;
  commune: string;
}
const basesLocalesSchema = new Schema<IBaseLocale>({
  _id: { type: Schema.Types.ObjectId },
  banId: { type: String },
  commune: { type: String },
});


interface IOther {
  id: Types.ObjectId;
  banId: string;
}
const otherSchema = new Schema<IOther>({
  id: { type: Schema.Types.ObjectId },
  banId: { type: String },
});

async function updateManyUuid(collection: string) {
  let count = 0
  const Model = model<IOther>(collection, otherSchema);
  const cursor = Model.find({banId: {$exists: false}}).lean()
  const total = await Model.count({banId: {$exists: false}})

  console.log(`START ${total} ${collection}`)
  for await (const entity of cursor) {
    count++

    await Model.updateOne({_id: entity._id}, {$set: {banId: uuid()}})

    if (count % 1000 === 0) {
      console.log(`Upload OK, ${count} / ${total} ${collection}`)
    }
  }
  console.log(`END, ${count} / ${total} ${collection}`)
}

async function getUuidBan(codeCommune: string): Promise<string> {
  const res = await fetch(`${process.env.BAN_API_URL}/api/district/cog/${codeCommune}`)
  const {response} = await res.json()
  return response[0].id
}

async function updateBalManyUuid() {
  let count = 0
  const BaseLocaleModel = model<IBaseLocale>('bases_locales', basesLocalesSchema);
  const cursor = BaseLocaleModel.find({banId: {$exists: false}})
  const total = await BaseLocaleModel.count({banId: {$exists: false}})
  const cacheUuid: Record<string, string> = {}

  console.log(`START ${total} bases_locales`)
  for await (const bal of cursor) {
    try {
      count++
      const banId = cacheUuid[bal.commune] ? cacheUuid[bal.commune] : (await getUuidBan(bal.commune))
      cacheUuid[bal.commune] = banId;
      await BaseLocaleModel.updateOne({_id: bal._id}, {$set: {banId}})  
    } catch (e) {
      console.log(`ERROR COMMUNE ${bal.commune}`, e)
    }

    if (count % 100 === 0) {
      console.log(`Upload OK, ${count} / ${total} bases_locales`)
    }
  }
  console.log(`END, ${count} / ${total} bases_locales`)
}

async function run() {
  // 4. Connect to MongoDB
  await connect(`${process.env.MONGODB_URL}/${process.env.MONGODB_DBNAME}`);
  await updateBalManyUuid();
  await updateManyUuid('voies')
  await updateManyUuid('toponymes')
  await updateManyUuid('numeros')
  await disconnect()
  process.exit(1);
}

run().catch((err) => console.log(err));
