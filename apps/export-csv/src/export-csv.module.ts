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

@Module({
  imports: [
    ConfigModule.forRoot(),
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
