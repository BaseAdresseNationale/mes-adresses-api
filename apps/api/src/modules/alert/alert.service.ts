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

  private extractRelationIdFromRawValues(
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

  private transformErrorInAlert(
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

  private async isSameAlert(
    alert1: Partial<Alert>,
    alert2: Partial<Alert>,
  ): Promise<boolean> {
    return (
      alert1.voieId === alert2.voieId &&
      alert1.toponymeId === alert2.toponymeId &&
      alert1.numeroId === alert2.numeroId &&
      alert1.field === alert2.field &&
      alert1.value === alert2.value &&
      alert1.error === alert2.error
    );
  }

  private async saveAlertsIfNotExists(
    balId: string,
    alertsDetected: Partial<Alert>[],
  ): Promise<Partial<Alert>[]> {
    const currentAlerts = await this.findAlertsByBal(balId);
    const alertsToSave: Partial<Alert>[] = alertsDetected.filter(
      (alertDetected) =>
        !currentAlerts.some((a) => this.isSameAlert(a, alertDetected)),
    );

    await this.alertsRepository
      .createQueryBuilder()
      .insert()
      .into(Alert)
      .values(alertsToSave)
      .execute();

    return [...alertsToSave, ...currentAlerts];
  }

  public async computeAlertsOnBal(baseLocale: BaseLocale) {
    const csvFile: string = await this.exportCsvService.exportToCsv(
      baseLocale,
      { withId: true },
    );
    const { rows } = await this.getReport(Buffer.from(csvFile));
    const alertsDetected: Partial<Alert>[] = [];
    for (const row of rows) {
      for (const error of row.errors) {
        // On vérifie que les champs touché par les erreurs nous interesse
        if (this.fieldsAuthorized.includes(error.schemaName)) {
          try {
            // On transforme l'erreur en alert
            const alertDetected = this.transformErrorInAlert(
              baseLocale.id,
              row,
              error,
            );
            // On ajoute l'alert à la liste des alerts détectés
            alertsDetected.push(alertDetected);
          } catch (error) {
            console.error(error);
          }
        }
      }
    }
    return this.saveAlertsIfNotExists(baseLocale.id, alertsDetected);
  }

  public async findAlertsByBal(balId: string): Promise<Alert[]> {
    return this.alertsRepository.find({
      where: { balId },
    });
  }
}
