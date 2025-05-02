import {
  BaseLocale,
  StatusBaseLocalEnum,
} from '@/shared/entities/base_locale.entity';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  UpdateManySignalementDTO,
  UpdateOneSignalementDTO,
} from './dto/update-signalement-dto';
import { OpenAPISignalementService } from './openAPI-signalement.service';

@Injectable()
export class SignalementService {
  constructor(private openAPISignalementService: OpenAPISignalementService) {}

  async findOneOrFail(signalementId: string) {
    const fetchedSignalement =
      await this.openAPISignalementService.getSignalementById(signalementId);

    if (!fetchedSignalement) {
      throw new HttpException(
        `Signalement ${signalementId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return fetchedSignalement;
  }

  async updateMany(
    baseLocale: BaseLocale,
    updateSignalementDTO: UpdateManySignalementDTO,
  ) {
    const { ids, status } = updateSignalementDTO;

    if (baseLocale.status !== StatusBaseLocalEnum.PUBLISHED) {
      throw new HttpException(
        'BaseLocale is not published',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    for (const signalementId of ids) {
      const fetchedSignalement = await this.findOneOrFail(signalementId);

      if (baseLocale.commune !== fetchedSignalement.codeCommune) {
        throw new HttpException(
          `Communes do not match for signalement ${signalementId}`,
          HttpStatus.PRECONDITION_FAILED,
        );
      }

      await this.openAPISignalementService.updateSignalement(signalementId, {
        status,
      });
    }

    return true;
  }

  async updateOne(
    baseLocale: BaseLocale,
    signalementId: string,
    updateSignalementDTO: UpdateOneSignalementDTO,
  ) {
    const { status, rejectionReason } = updateSignalementDTO;

    if (baseLocale.status !== StatusBaseLocalEnum.PUBLISHED) {
      throw new HttpException(
        'BaseLocale is not published',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    const fetchedSignalement = await this.findOneOrFail(signalementId);

    if (baseLocale.commune !== fetchedSignalement.codeCommune) {
      throw new HttpException(
        `Communes do not match for signalement ${signalementId}`,
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    await this.openAPISignalementService.updateSignalement(signalementId, {
      status,
      rejectionReason,
    });

    return true;
  }
}
