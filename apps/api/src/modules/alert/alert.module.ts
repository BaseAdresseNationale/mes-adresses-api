import { MiddlewareConsumer, Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExportCsvModule } from '@/shared/modules/export_csv/export_csv.module';
import { Alert } from '@/shared/entities/alert.entity';

import { AlertService } from '@/modules/alert/alert.service';
import { BaseLocaleModule } from '@/modules/base_locale/base_locale.module';
import { AlertController } from '@/modules/alert/alert.controller';
import { BaseLocaleMiddleware } from '@/modules/base_locale/base_locale.middleware';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert]),
    forwardRef(() => BaseLocaleModule),
    forwardRef(() => ExportCsvModule),
  ],
  providers: [AlertService, BaseLocaleMiddleware],
  controllers: [AlertController],
})
export class AlertModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BaseLocaleMiddleware).forRoutes(AlertController);
  }
}
