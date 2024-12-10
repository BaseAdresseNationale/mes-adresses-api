import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  SignalementsService,
  OpenAPI as OpenAPISignalement,
  UpdateSignalementDTO,
} from '@/shared/openapi-signalement';

@Injectable()
export class OpenAPISignalementService {
  constructor(private configService: ConfigService) {
    OpenAPISignalement.BASE = this.configService.get('API_SIGNALEMENT_URL');
    OpenAPISignalement.TOKEN = this.configService.get(
      'API_SIGNALEMENT_CLIENT_SECRET',
    );
  }

  getSignalementById(signalementId: string) {
    return SignalementsService.getSignalementById(signalementId);
  }

  async updateSignalement(
    signalementId: string,
    updateSignalementDTO: UpdateSignalementDTO,
  ) {
    return SignalementsService.updateSignalement(
      signalementId,
      updateSignalementDTO,
    );
  }
}
