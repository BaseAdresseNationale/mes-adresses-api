import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExportCsvService } from '@/shared/modules/export_csv/export_csv.service';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Numero } from '@/shared/entities/numero.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Toponyme, Voie, Numero])],
  providers: [ExportCsvService],
  exports: [ExportCsvService],
})
export class ExportCsvModule {}
