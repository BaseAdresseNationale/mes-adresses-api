import { Injectable, Inject, forwardRef } from '@nestjs/common';

import { BaseLocale } from '@/shared/entities/base_locale.entity';

import { ExportCsvService } from '@/shared/modules/export_csv/export_csv.service';
import {
  ErrorLevelType,
  validateFile,
  ValidateRowFullType,
  ValidateType,
} from '@ban-team/validateur-bal';
import { Alert } from '@/shared/entities/alert.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AlertService {
  fieldsAuthorized: string[] = [
    'voie_nom',
    'lieudit_complement_nom',
    'numero',
    'suffixe',
  ];

  constructor(
    @InjectRepository(Alert)
    private alertsRepository: Repository<Alert>,
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

  public async createAlert(alert: Partial<Alert>) {
    const entityToSave: Alert = this.alertsRepository.create(alert);
    return await this.alertsRepository.save(entityToSave);
  }

  public extractRelationIdFromRawValues(
    schemaName: string,
    rawValues: Record<string, string>,
  ): Record<string, string> {
    if (schemaName === 'voie_nom') {
      if (rawValues.numero === '99999') {
        return { toponymeId: rawValues.id_bal_toponyme };
      }
      return { voieId: rawValues.id_bal_voie };
    } else if (schemaName === 'lieudit_complement_nom') {
      return { toponymeId: rawValues.id_bal_toponyme };
    } else if (['numero', 'suffixe'].includes(schemaName)) {
      return { numeroId: rawValues.id_bal_adresse };
    }
    return {};
  }

  public transformErrorInAlert(
    balId: string,
    row: ValidateRowFullType,
    { code, schemaName, level }: ErrorLevelType,
  ): Partial<Alert> {
    return {
      balId,
      ...this.extractRelationIdFromRawValues(schemaName, row.rawValues),
      field: schemaName,
      value: row.parsedValues[schemaName],
      error: code.split('.').pop(),
      severity: level,
    };
  }

  public async computeAlertsOnBal(baseLocale: BaseLocale) {
    const csvFile: string = await this.exportCsvService.exportToCsv(
      baseLocale,
      { withId: true },
    );
    const { rows } = await this.getReport(Buffer.from(csvFile));

    for (const row of rows) {
      for (const error of row.errors) {
        if (this.fieldsAuthorized.includes(error.schemaName)) {
          try {
            const newAlert = this.transformErrorInAlert(
              baseLocale.id,
              row,
              error,
            );
            console.log(newAlert);
            await this.createAlert(newAlert);
          } catch (error) {
            console.error(error);
          }
        }
      }
    }
  }
}
