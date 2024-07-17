import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { of, catchError, firstValueFrom } from 'rxjs';

@Injectable()
export class BanPlateformService {
  constructor(private readonly httpService: HttpService) {}

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
          console.error('error', error.response.data);
          throw error;
        }),
      ),
    );

    return data.response[0].id;
  }
}
