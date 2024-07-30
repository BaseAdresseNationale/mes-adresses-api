import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { BaseLocale } from './libs/shared/src/entities/base_locale.entity';
import { Voie } from './libs/shared/src/entities/voie.entity';
import { Numero } from './libs/shared/src/entities/numero.entity';
import { Toponyme } from './libs/shared/src/entities/toponyme.entity';
import { Position } from './libs/shared/src/entities/position.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.POSTGRES_URL,
  synchronize: false,
  logging: true,
  entities: [BaseLocale, Voie, Toponyme, Numero, Position],
  migrationsRun: false,
  migrations: ['**/migrations/*.ts'],
});
