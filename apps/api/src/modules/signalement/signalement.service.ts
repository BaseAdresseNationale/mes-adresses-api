import {
  BaseLocale,
  StatusBaseLocalEnum,
} from '@/shared/entities/base_locale.entity';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UpdateManyReportsDTO } from './dto/update-signalement-dto';
import { OpenAPISignalementService } from './openAPI-signalement.service';
import {
  Alert,
  Signalement,
  Report,
  UpdateSignalementDTO,
  UpdateAlertDTO,
} from '@/shared/openapi-signalement';

@Injectable()
export class SignalementService {
  constructor(private openAPISignalementService: OpenAPISignalementService) {}

  async findOneOrFail(reportId: string): Promise<Signalement | Alert> {
    let fetchedReport;

    try {
      fetchedReport =
        await this.openAPISignalementService.getSignalementById(reportId);
    } catch (error) {
      try {
        fetchedReport =
          await this.openAPISignalementService.getAlertById(reportId);
      } catch (error) {
        throw new HttpException(
          `Report ${reportId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }
    }

    return fetchedReport;
  }

  async updateOne(
    baseLocale: BaseLocale,
    reportId: string,
    updateDTO: UpdateSignalementDTO | UpdateAlertDTO,
  ) {
    if (baseLocale.status !== StatusBaseLocalEnum.PUBLISHED) {
      throw new HttpException(
        'BaseLocale is not published',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    const fetchedReport = await this.findOneOrFail(reportId);

    if (baseLocale.commune !== fetchedReport.codeCommune) {
      throw new HttpException(
        `Communes do not match for report ${reportId}`,
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    if (fetchedReport.reportKind === Report.reportKind.SIGNALEMENT) {
      // Remove alert-only fields (like `context`) before updating a signalement
      const { context, ...signalementUpdateDTO } = updateDTO as UpdateSignalementDTO & {
        // `context` can be present when coming from a broader DTO (e.g. UpdateOneReportDTO)
        context?: unknown;
      };
      await this.openAPISignalementService.updateSignalement(
        reportId,
        signalementUpdateDTO as UpdateSignalementDTO,
      );
    } else if (fetchedReport.reportKind === Report.reportKind.ALERT) {
      await this.openAPISignalementService.updateAlert(
        reportId,
        updateDTO as UpdateAlertDTO,
      );
    } else {
      throw new HttpException(
        `Unexpected reportKind '${fetchedReport.reportKind}' for report ${reportId}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return true;
  }

  async updateMany(
    baseLocale: BaseLocale,
    updateSignalementDTO: UpdateManyReportsDTO,
  ) {
    const { ids, status } = updateSignalementDTO;

    for (const reportId of ids) {
      await this.updateOne(baseLocale, reportId, {
        status,
      });
    }

    return true;
  }
}
