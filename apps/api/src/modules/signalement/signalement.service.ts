import {
  BaseLocale,
  StatusBaseLocalEnum,
} from '@/shared/entities/base_locale.entity';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UpdateSignalementDTO } from './dto/update-signalement-dto';
import { OpenAPISignalementService } from './openAPI-signalement.service';

@Injectable()
export class SignalementService {
  constructor(private openAPISignalementService: OpenAPISignalementService) {}

  async updateMany(
    baseLocale: BaseLocale,
    updateSignalementDTO: UpdateSignalementDTO,
  ) {
    const { ids, status } = updateSignalementDTO;

    if (baseLocale.status !== StatusBaseLocalEnum.PUBLISHED) {
      throw new HttpException(
        'BaseLocale is not published',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    for (const signalementId of ids) {
      const fetchedSignalement =
        await this.openAPISignalementService.getSignalementById(signalementId);

      if (!fetchedSignalement) {
        throw new HttpException(
          `Signalement ${signalementId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

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
}
