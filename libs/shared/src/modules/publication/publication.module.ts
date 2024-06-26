import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  BaseLocale,
  BaseLocaleSchema,
} from '@/shared/schemas/base_locale/base_locale.schema';
import { Numero, NumeroSchema } from '@/shared/schemas/numero/numero.schema';
import { ApiDepotModule } from '@/shared/modules/api_depot/api_depot.module';
import { ExportCsvModule } from '@/shared/modules/export_csv/export_csv.module';
import { PublicationService } from '@/shared/modules/publication/publication.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: BaseLocale.name, schema: BaseLocaleSchema },
      { name: Numero.name, schema: NumeroSchema },
    ]),
    ApiDepotModule,
    ExportCsvModule,
  ],
  providers: [PublicationService],
  exports: [PublicationService],
})
export class PublicationModule {}
