import { Module, MiddlewareConsumer, forwardRef } from '@nestjs/common';

import { BaseLocaleMiddleware } from '@/modules/base_locale/base_locale.middleware';
import { ExportCsvController } from '@/modules/base_locale/modules/export_csv/export_csv.controller';
import { BaseLocaleModule } from '../../base_locale.module';
import { ExportCsvService } from './export_csv.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Numero } from '@/shared/entities/numero.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';

@Module({
  imports: [
    forwardRef(() => BaseLocaleModule),
    TypeOrmModule.forFeature([Voie, Toponyme, Numero]),
  ],
  providers: [BaseLocaleMiddleware, ExportCsvService],
  controllers: [ExportCsvController],
  exports: [ExportCsvService],
})
export class ExportCsvModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BaseLocaleMiddleware).forRoutes(ExportCsvController);
  }
}
