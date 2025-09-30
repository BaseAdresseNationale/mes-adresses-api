import { Module, forwardRef } from '@nestjs/common';

import { AlertsService } from '@/modules/alert/alert.service';
import { BaseLocaleModule } from '@/modules/base_locale/base_locale.module';
import { ExportCsvModule } from '@/modules/base_locale/sub_modules/export_csv/export_csv.module';

@Module({
  imports: [
    forwardRef(() => BaseLocaleModule),
    forwardRef(() => ExportCsvModule),
  ],
  providers: [AlertsService],
  controllers: [],
})
export class AlertModule {}
