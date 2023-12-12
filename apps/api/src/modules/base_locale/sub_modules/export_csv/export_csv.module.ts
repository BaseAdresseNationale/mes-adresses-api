import { Module, MiddlewareConsumer, forwardRef } from '@nestjs/common';

import { ExportCsvModule as ExportCsvSharedModule } from '@/shared/modules/export_csv/export_csv.module';

import { BaseLocaleMiddleware } from '@/modules/base_locale/base_locale.middleware';
import { ExportCsvController } from '@/modules/base_locale/sub_modules/export_csv/export_csv.controller';
import { BaseLocaleModule } from '../../base_locale.module';

@Module({
  imports: [ExportCsvSharedModule, forwardRef(() => BaseLocaleModule)],
  providers: [BaseLocaleMiddleware],
  controllers: [ExportCsvController],
})
export class ExportCsvModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BaseLocaleMiddleware).forRoutes(ExportCsvController);
  }
}
