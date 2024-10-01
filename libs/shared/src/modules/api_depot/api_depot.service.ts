import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { of, catchError, firstValueFrom } from 'rxjs';
import * as hasha from 'hasha';

import { Habilitation } from './types/habilitation.type';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Revision } from '@/shared/modules/api_depot/types/revision.type';
import { ConfigService } from '@nestjs/config';
import { ObjectId } from 'mongodb';

@Injectable()
export class ApiDepotService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async findOneHabiliation(habilitationId: string): Promise<Habilitation> {
    if (!ObjectId.isValid(habilitationId)) {
      throw new HttpException(
        'L’identifiant de l’habilitation est invalide',
        HttpStatus.NOT_FOUND,
      );
    }

    const { data } = await firstValueFrom(
      this.httpService
        .get<Habilitation>(`habilitations/${habilitationId}`)
        .pipe(
          catchError((error: AxiosError) => {
            const { message, code } = error.response.data as any;
            throw new HttpException(message, code);
          }),
        ),
    );

    return data;
  }

  async createOneHabiliation(baseLocale: BaseLocale): Promise<Habilitation> {
    const { data: habilitation } = await firstValueFrom(
      this.httpService
        .post<Habilitation>(`communes/${baseLocale.commune}/habilitations`)
        .pipe(
          catchError((error: AxiosError) => {
            console.error('ERROR createOneHabiliation');
            console.error(error);
            throw error;
          }),
        ),
    );

    return habilitation;
  }

  async sendPinCodeHabiliation(habilitationId: string): Promise<void> {
    await firstValueFrom(
      this.httpService
        .post<void>(
          `habilitations/${habilitationId}/authentication/email/send-pin-code`,
        )
        .pipe(
          catchError((error: AxiosError) => {
            console.error('ERROR sendPinCodeHabiliation');
            console.error(error);
            throw error;
          }),
        ),
    );
  }

  async validatePinCodeHabiliation(
    habilitationId: string,
    code: string,
  ): Promise<void> {
    await firstValueFrom(
      this.httpService
        .post<any>(
          `habilitations/${habilitationId}/authentication/email/validate-pin-code`,
          { code },
        )
        .pipe(
          catchError((error: AxiosError) => {
            console.error('ERROR validatePinCodeHabiliation');
            console.error(error);
            throw error;
          }),
        ),
    );
  }

  private async createRevision(
    codeCommune: string,
    balId: string,
  ): Promise<Revision> {
    const { data: revision } = await firstValueFrom(
      this.httpService
        .post<Revision>(`/communes/${codeCommune}/revisions`, {
          context: { extras: { balId } },
        })
        .pipe(
          catchError((error: AxiosError) => {
            console.error('ERROR createRevision');
            console.error(error);
            throw error;
          }),
        ),
    );
    return revision;
  }

  private async uploadFileRevision(revisionId: string, balFile: string) {
    await firstValueFrom(
      this.httpService
        .put(`/revisions/${revisionId}/files/bal`, balFile, {
          headers: {
            'Content-Type': 'application/csv',
            'Content-MD5': hasha(balFile, { algorithm: 'md5' }),
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            console.error('ERROR uploadFileRevision');
            console.error(error);
            throw error;
          }),
        ),
    );
  }

  private async computeRevision(revisionId: string): Promise<Revision> {
    const { data: revision } = await firstValueFrom(
      await this.httpService
        .post<Revision>(`/revisions/${revisionId}/compute`)
        .pipe(
          catchError((error: AxiosError) => {
            console.error('ERROR computeRevision');
            console.error(error);
            throw error;
          }),
        ),
    );
    return revision;
  }

  private async publishRevision(
    revisionId: string,
    habilitationId: string,
  ): Promise<Revision> {
    const { data: revision } = await firstValueFrom(
      await this.httpService
        .post<Revision>(`/revisions/${revisionId}/publish`, {
          habilitationId,
        })
        .pipe(
          catchError((error: AxiosError) => {
            console.error('ERROR publishRevision');
            console.error(error);
            throw error;
          }),
        ),
    );
    return revision;
  }

  public async publishNewRevision(
    codeCommune: string,
    balId: string,
    balFile: string,
    habilitationId: string,
  ) {
    const revision: Revision = await this.createRevision(codeCommune, balId);
    await this.uploadFileRevision(revision._id, balFile);
    const computedRevision: Revision = await this.computeRevision(revision._id);

    if (!computedRevision.validation.valid) {
      console.warn(`Export BAL non valide : ${balId}`);
      console.warn(computedRevision.validation.errors);
      throw new HttpException(
        'La fichier BAL n’est pas valide. Merci de contacter le support.',
        HttpStatus.EXPECTATION_FAILED,
      );
    }
    const publishedRevision: Revision = await this.publishRevision(
      computedRevision._id,
      habilitationId,
    );
    return publishedRevision;
  }

  public async getCurrentRevision(codeCommune: string): Promise<Revision> {
    const { data: revision } = await firstValueFrom(
      await this.httpService
        .get<Revision>(`/communes/${codeCommune}/current-revision`)
        .pipe(
          catchError((error: AxiosError) => {
            if (error.response && error.response.status === 404) {
              return of({ data: null });
            }
            console.error('ERROR getCurrentRevision');
            console.error(error);
            throw error;
          }),
        ),
    );

    return revision;
  }

  public async getCurrentRevisions(
    publishedSince: Date = new Date('1970-01-01'),
  ): Promise<Revision[]> {
    const { data: revisions } = await firstValueFrom(
      await this.httpService
        .get<Revision[]>(
          `/current-revisions?publishedSince=${publishedSince.toISOString()}`,
        )
        .pipe(
          catchError((error: AxiosError) => {
            if (error.response && error.response.status === 404) {
              return of({ data: null });
            }
            console.error('ERROR getCurrentRevisions');
            console.error(error);
            throw error;
          }),
        ),
    );

    return revisions;
  }

  public async downloadCurrentRevisionFile(
    codeCommune: string,
  ): Promise<Buffer> {
    const apiDepotUrl = this.configService.get<string>('API_DEPOT_URL');
    const currentRevisionUrl = `${apiDepotUrl}/communes/${codeCommune}/current-revision/files/bal/download`;

    const response = await this.httpService.axiosRef({
      url: currentRevisionUrl,
      method: 'GET',
      responseType: 'arraybuffer',
    });

    return response.data;
  }
}
