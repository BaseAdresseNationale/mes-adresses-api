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

// 1. Create an interface representing a document in MongoDB.
interface IBaseLocale {
  status: StatusBaseLocalEnum;
}

// 2. Create a Schema corresponding to the document interface.
const basesLocalesSchema = new Schema<IBaseLocale>({
  status: { type: String, enum: StatusBaseLocalEnum },
});

// 3. Create a Model.
const BaseLocale = model<IBaseLocale>('bases_locales', basesLocalesSchema);

async function run() {
  // 4. Connect to MongoDB
  await connect(`${process.env.MONGODB_URL}/${process.env.MONGODB_DBNAME}`);

  await BaseLocale.updateMany(
    {
      status: StatusBaseLocalEnum.READY_TO_PUBLISH,
    },
    {
      $set: { status: StatusBaseLocalEnum.DRAFT },
      $unset: { sync: 1 },
    },
  );
  process.exit(1);
}

run().catch((err) => console.log(err));
