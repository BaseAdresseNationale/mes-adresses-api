import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Numero, NumeroSchema } from '@/shared/schemas/numero/numero.schema';
import { Voie, VoieSchema } from '@/shared/schemas/voie/voie.schema';
import {
  Toponyme,
  ToponymeSchema,
} from '@/shared/schemas/toponyme/toponyme.schema';

import { ExportCsvService } from '@/shared/modules/export_csv/export_csv.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Numero.name, schema: NumeroSchema },
      { name: Voie.name, schema: VoieSchema },
      { name: Toponyme.name, schema: ToponymeSchema },
    ]),
  ],
  providers: [ExportCsvService],
  exports: [ExportCsvService],
})
export class ExportCsvModule {}
