import { Module } from '@nestjs/common';
import { ExportCsvService } from './export-csv.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  BaseLocale,
  BaseLocaleSchema,
} from '@/shared/schemas/base_locale/base_locale.schema';
import { Voie, VoieSchema } from '@/shared/schemas/voie/voie.schema';
import {
  Toponyme,
  ToponymeSchema,
} from '@/shared/schemas/toponyme/toponyme.schema';
import { Numero, NumeroSchema } from '@/shared/schemas/numero/numero.schema';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BaseLocale as BaseLocaleP } from '@/shared/entities/base_locale.entity';
import { Voie as VoieP } from '@/shared/entities/voie.entity';
import { Toponyme as ToponymeP } from '@/shared/entities/toponyme.entity';
import { Numero as NumeroP } from '@/shared/entities/numero.entity';
import { Position as PositionP } from '@/shared/entities/position.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'api-bal-user',
      password: 'password',
      database: 'api-bal',
      entities: [BaseLocaleP, VoieP, ToponymeP, NumeroP, PositionP],
      synchronize: false,
    }),
    TypeOrmModule.forFeature([
      BaseLocaleP,
      VoieP,
      ToponymeP,
      NumeroP,
      PositionP,
    ]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        console.log(config.get('MONGODB_URL'), config.get('MONGODB_DBNAME'));
        return {
          uri: config.get('MONGODB_URL'),
          dbName: config.get('MONGODB_DBNAME'),
        };
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: BaseLocale.name, schema: BaseLocaleSchema },
      { name: Voie.name, schema: VoieSchema },
      { name: Toponyme.name, schema: ToponymeSchema },
      { name: Numero.name, schema: NumeroSchema },
    ]),
  ],
  providers: [ExportCsvService],
})
export class ExportCsvModule {}
