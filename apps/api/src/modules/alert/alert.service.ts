import { Injectable, Inject, forwardRef } from '@nestjs/common';

import { BaseLocale } from '@/shared/entities/base_locale.entity';

import { ExportCsvService } from '@/shared/modules/export_csv/export_csv.service';
import { validateFile } from '@ban-team/validateur-bal';

@Injectable()
export class AlertsService {
  constructor(
    @Inject(forwardRef(() => ExportCsvService))
    private exportCsvService: ExportCsvService,
  ) {}

  public async computeAlertsOnBal(baseLocale: BaseLocale) {
    const csvFile: string = await this.exportCsvService.exportToCsv(baseLocale);
    const report = await validateFile(Buffer.from(csvFile));
    return report;
  }
}
