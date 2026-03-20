import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  SignalementsService,
  OpenAPI as OpenAPISignalement,
  UpdateSignalementDTO,
  AlertsService,
  UpdateAlertDTO,
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

  getAlertById(alertId: string) {
    return AlertsService.getAlertById(alertId);
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

  async updateAlert(alertId: string, updateAlertDTO: UpdateAlertDTO) {
    return AlertsService.updateAlert(alertId, updateAlertDTO);
  }
}
