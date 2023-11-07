import { extractFromCsv } from '@/lib/utils/csv.utils';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { BaseLocaleService } from '../../base_locale.service';

@Injectable()
export class PopulateService {
  constructor(
    private readonly httpService: HttpService,
    private configService: ConfigService,
    @Inject(forwardRef(() => BaseLocaleService))
    private baseLocaleService: BaseLocaleService,
  ) {}

  private async extractFromApiDepot(codeCommune: string) {
    const apiDepotUrl = this.configService.get<string>('API_DEPOT_URL');
    const currentRevisionUrl = `${apiDepotUrl}/communes/${codeCommune}/current-revision`;

    const { data } = await firstValueFrom(
      this.httpService.get(`${currentRevisionUrl}/files/bal/download`).pipe(
        catchError((error: AxiosError) => {
          throw error;
        }),
      ),
    );

    return extractFromCsv(data, codeCommune);
  }

  private async extractFromBAN(codeCommune: string) {
    const banApiUrl = this.configService.get<string>('BAN_API_URL');
    const balFileData = `${banApiUrl}/ban/communes/${codeCommune}/download/csv-bal/adresses`;

    const { data } = await firstValueFrom(
      this.httpService.get(balFileData).pipe(
        catchError((error: AxiosError) => {
          throw error;
        }),
      ),
    );

    return extractFromCsv(data, codeCommune);
  }

  public async extract(codeCommune: string) {
    const data =
      (await this.extractFromApiDepot(codeCommune)) ||
      (await this.extractFromBAN(codeCommune));

    if (data) {
      return data;
    }

    console.error(
      `Aucune adresse n’a pu être extraite avec le code commune: ${codeCommune}`,
    );
    return { voies: [], numeros: [], toponymes: [] };
  }
}
