import { extractFromCsv } from '@/lib/utils/csv.utils';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PopulateService {
  constructor(
    private readonly httpService: HttpService,
    private configService: ConfigService,
  ) {}

  private async extractFromApiDepot(codeCommune: string) {
    try {
      const apiDepotUrl = this.configService.get<string>('API_DEPOT_URL');
      const currentRevisionUrl = `${apiDepotUrl}/communes/${codeCommune}/current-revision/files/bal/download`;

      const response = await this.httpService.axiosRef({
        url: currentRevisionUrl,
        method: 'GET',
        responseType: 'arraybuffer',
      });

      const result = await extractFromCsv(response.data, codeCommune);

      if (!result.isValid) {
        throw new Error('Invalid CSV file');
      }

      return result;
    } catch {}
  }

  private async extractFromBAN(codeCommune: string) {
    try {
      const banApiUrl = this.configService.get<string>('BAN_API_URL');
      const balFileData = `${banApiUrl}/ban/communes/${codeCommune}/download/csv-bal/adresses`;

      const response = await this.httpService.axiosRef({
        url: balFileData,
        method: 'GET',
        responseType: 'arraybuffer',
      });

      const result = await extractFromCsv(response.data, codeCommune);

      if (!result.isValid) {
        throw new Error('Invalid CSV file');
      }

      return result;
    } catch {}
  }

  public async extract(codeCommune: string) {
    const fromApiDepot = await this.extractFromApiDepot(codeCommune);
    const fromBan = await this.extractFromBAN(codeCommune);

    const result = fromApiDepot || fromBan;

    if (result) {
      return result;
    }

    console.error(
      `Aucune adresse n’a pu être extraite avec le code commune: ${codeCommune}`,
    );

    return { voies: [], numeros: [], toponymes: [] };
  }
}
