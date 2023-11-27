import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { Habilitation } from '@/shared/modules/api_depot/types/habilitation.type';
import { ApiDepotService } from '@/shared/modules/api_depot/api_depot.service';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';

import { BaseLocaleService } from '../../base_locale.service';

@Injectable()
export class HabilitationService {
  constructor(
    private readonly baseLocaleService: BaseLocaleService,
    private readonly apiDepotService: ApiDepotService,
  ) {}

  async findOne(habilitationId: string): Promise<Habilitation> {
    return this.apiDepotService.findOneHabiliation(habilitationId);
  }

  async createOne(baseLocale: BaseLocale): Promise<Habilitation> {
    if (baseLocale._habilitation) {
      const habilitation = await this.findOne(baseLocale._habilitation);

      const now = new Date();
      const { status, expiresAt } = habilitation;

      if (status === 'accepted' && new Date(expiresAt) > now) {
        throw new HttpException(
          'Cette Base Adresse Locale possède déjà une habilitation',
          HttpStatus.PRECONDITION_FAILED,
        );
      }
    }

    const habilitation: Habilitation =
      await this.apiDepotService.createOneHabiliation(baseLocale);

    await this.baseLocaleService.updateHabilitation(baseLocale, habilitation);

    return habilitation;
  }

  async sendPinCode(
    habilitationId: string,
  ): Promise<{ code: number; message: string }> {
    const habilitation = await this.findOne(habilitationId);

    if (habilitation.status !== 'pending') {
      throw new HttpException(
        'Aucune demande d’habilitation en attente',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    const data =
      await this.apiDepotService.sendPinCodeHabiliation(habilitationId);

    return data;
  }

  async validatePinCode(
    habilitationId: string,
    code: number,
  ): Promise<{ validated: boolean }> {
    const habilitation = await this.findOne(habilitationId);

    if (habilitation.status !== 'pending') {
      throw new HttpException(
        'Aucune demande d’habilitation en attente',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    const data = await this.apiDepotService.validatePinCodeHabiliation(
      habilitationId,
      code,
    );

    return data;
  }
}
