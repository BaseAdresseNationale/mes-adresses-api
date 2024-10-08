import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import {
  Habilitation,
  StatusHabiliation,
} from '@/shared/modules/api_depot/types/habilitation.type';
import { ApiDepotService } from '@/shared/modules/api_depot/api_depot.service';
import { BaseLocale } from '@/shared/entities/base_locale.entity';

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

  async isValid(habilitationId: string): Promise<boolean> {
    const habilitation: Habilitation =
      await this.apiDepotService.findOneHabiliation(habilitationId);
    // On verifie que l'habilitation est valide
    if (habilitation.status !== StatusHabiliation.ACCEPTED) {
      return false;
    }
    // On verifie que l'habilitation n'est pas expirée
    if (
      !habilitation.expiresAt ||
      new Date(habilitation.expiresAt) < new Date()
    ) {
      return false;
    }
    return true;
  }

  async createOne(baseLocale: BaseLocale): Promise<Habilitation> {
    if (baseLocale.habilitationId) {
      const habilitation = await this.findOne(baseLocale.habilitationId);

      const now = new Date();
      const { status, expiresAt } = habilitation;

      if (status === StatusHabiliation.ACCEPTED && new Date(expiresAt) > now) {
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

  async sendPinCode(habilitationId: string): Promise<void> {
    const habilitation: Habilitation = await this.findOne(habilitationId);
    if (habilitation.status !== StatusHabiliation.PENDING) {
      throw new HttpException(
        'Aucune demande d’habilitation en attente',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    try {
      await this.apiDepotService.sendPinCodeHabiliation(habilitationId);
    } catch (error) {
      const { statusCode, message } = error.response.data;
      throw new HttpException(message, statusCode);
    }
  }

  async validatePinCode(habilitationId: string, code: string): Promise<any> {
    const habilitation: Habilitation = await this.findOne(habilitationId);

    if (habilitation.status !== StatusHabiliation.PENDING) {
      throw new HttpException(
        'Aucune demande d’habilitation en attente',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    try {
      const data = await this.apiDepotService.validatePinCodeHabiliation(
        habilitationId,
        code,
      );
      return data;
    } catch (error) {
      const { statusCode, message } = error.response.data;
      throw new HttpException(message, statusCode);
    }
  }
}
