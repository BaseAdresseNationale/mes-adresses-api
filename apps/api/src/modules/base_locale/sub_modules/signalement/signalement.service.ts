import { Injectable } from '@nestjs/common';
import { DefaultService as OpenAPISignalementService } from './openapi/services/DefaultService';
import { OpenAPI, Signalement, UpdateSignalementDTO } from './openapi';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SignalementService {
  constructor(private readonly configService: ConfigService) {
    OpenAPI.BASE = this.configService.get('API_SIGNALEMENT_URL');
    OpenAPI.HEADERS = {
      ['content-type']: 'application/json',
    };
  }

  getSignalementsByCodeCommune(codeCommune: string): Promise<Signalement[]> {
    return OpenAPISignalementService.getSignalementsByCodeCommune(codeCommune);
  }

  updateSignalement(
    updateSignalementDTO: UpdateSignalementDTO,
  ): Promise<Signalement> {
    return OpenAPISignalementService.updateSignalement(updateSignalementDTO);
  }
}
