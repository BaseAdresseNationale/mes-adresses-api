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

  async updateOne(
    baseLocale: BaseLocale,
    signalementId: string,
    updateSignalementDTO: UpdateOneSignalementDTO,
  ) {
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

    await this.openAPISignalementService.updateSignalement(
      signalementId,
      updateSignalementDTO,
    );

    return true;
  }

  async updateMany(
    baseLocale: BaseLocale,
    updateSignalementDTO: UpdateManySignalementDTO,
  ) {
    const { ids, status } = updateSignalementDTO;

    for (const signalementId of ids) {
      await this.updateOne(baseLocale, signalementId, {
        status,
      });
    }

    return true;
  }
}
