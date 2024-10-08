import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { of, catchError, firstValueFrom } from 'rxjs';

@Injectable()
export class BanPlateformService {
  constructor(
    private readonly httpService: HttpService,
    private readonly logger: Logger,
  ) {}

  public async getBanAssemblage(codeCommune: string): Promise<Buffer> {
    const { data } = await firstValueFrom(
      await this.httpService
        .get<Buffer>(`/ban/communes/${codeCommune}/download/csv-bal/adresses`, {
          responseType: 'arraybuffer',
        })
        .pipe(
          catchError((error: AxiosError) => {
            if (error.response && error.response.status === 404) {
              return of({ data: null });
            }
            throw error;
          }),
        ),
    );
    return data;
  }

  public async getIdBanCommune(codeCommune: string): Promise<string> {
    const { data } = await firstValueFrom(
      await this.httpService.get<any>(`/api/district/cog/${codeCommune}`).pipe(
        catchError((error: AxiosError) => {
          this.logger.error(
            `Impossible de récupérer le code distict pour la commune ${codeCommune}`,
            error,
            BanPlateformService.name,
          );
          throw new HttpException(
            'Impossible de récupérer le code distict',
            HttpStatus.BAD_GATEWAY,
          );
        }),
      ),
    );

    return data.response[0].id;
  }
}
