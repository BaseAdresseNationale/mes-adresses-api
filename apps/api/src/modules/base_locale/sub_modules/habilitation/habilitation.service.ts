import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { Habilitation } from './types/habilitation.type';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';
import { BaseLocaleService } from '../../base_locale.service';

@Injectable()
export class HabilitationService {
  constructor(
    private readonly httpService: HttpService,
    private readonly baseLocaleService: BaseLocaleService,
  ) {}

  async findOne(habilitationId: string): Promise<Habilitation> {
    const { data } = await firstValueFrom(
      this.httpService
        .get<Habilitation>(`habilitations/${habilitationId}`)
        .pipe(
          catchError((error: AxiosError) => {
            throw error;
          }),
        ),
    );

    return data;
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

    const { data: habilitation } = await firstValueFrom(
      this.httpService
        .post<Habilitation>(`communes/${baseLocale.commune}/habilitations`)
        .pipe(
          catchError((error: AxiosError) => {
            throw error;
          }),
        ),
    );

    await this.baseLocaleService.updateHabilitation(baseLocale, habilitation);

    return habilitation;
  }

  async sendPinCode(habilitationId: string) {
    const habilitation = await this.findOne(habilitationId);

    if (habilitation.status !== 'pending') {
      throw new HttpException(
        'Aucune demande d’habilitation en attente',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    const { data } = await firstValueFrom(
      this.httpService.post<{ code: number; message: string }>(
        `habilitations/${habilitationId}/authentication/email/send-pin-code`,
      ),
    );

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

    const { data } = await firstValueFrom(
      this.httpService
        .post<{ validated: boolean }>(
          `habilitations/${habilitationId}/authentication/email/validate-pin-code`,
          { code },
        )
        .pipe(
          catchError((error: AxiosError) => {
            throw error;
          }),
        ),
    );

    return data;
  }
}
