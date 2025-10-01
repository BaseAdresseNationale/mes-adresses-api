import { Injectable, Inject, forwardRef } from '@nestjs/common';

import { BaseLocale } from '@/shared/entities/base_locale.entity';

import { ExportCsvService } from '@/shared/modules/export_csv/export_csv.service';
import { validateFile, ValidateType } from '@ban-team/validateur-bal';

@Injectable()
export class AlertService {
  constructor(
    @Inject(forwardRef(() => ExportCsvService))
    private exportCsvService: ExportCsvService,
  ) {}

  private async getReport(file: Buffer): Promise<ValidateType> {
    const report = await validateFile(file);
    if (report.parseOk) {
      return report as ValidateType;
    }
    throw new Error('Validator failed to parse file');
  }

  public async computeAlertsOnBal(baseLocale: BaseLocale) {
    const csvFile: string = await this.exportCsvService.exportToCsv(baseLocale);
    const { rows } = await this.getReport(Buffer.from(csvFile));

    for (const row of rows) {
      for (const error of row.errors) {
        if (error.schemaName === 'voie_nom') {
          console.log(row, error);
        }
      }
    }
  }
}
