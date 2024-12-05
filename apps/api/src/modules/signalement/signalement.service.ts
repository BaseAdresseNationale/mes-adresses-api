import {
  BaseLocale,
  StatusBaseLocalEnum,
} from '@/shared/entities/base_locale.entity';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UpdateSignalementDTO } from './dto/update-signalement-dto';
import {
  SignalementsService,
  OpenAPI as OpenAPISignalement,
} from 'libs/openapi-signalement';

@Injectable()
export class SignalementService {
  constructor(private configService: ConfigService) {
    OpenAPISignalement.BASE = this.configService.get('API_SIGNALEMENT_URL');
    OpenAPISignalement.TOKEN = this.configService.get(
      'API_SIGNALEMENT_CLIENT_SECRET',
    );
  }

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
        await SignalementsService.getSignalementById(signalementId);

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

      await SignalementsService.updateSignalement(signalementId, {
        status,
      });
    }

    return true;
  }
}
