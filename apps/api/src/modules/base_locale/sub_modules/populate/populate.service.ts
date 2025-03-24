import {
  FromCsv,
  FromCsvError,
  FromCsvValid,
  extractFromCsv,
} from '@/lib/utils/csv.utils';
import { ApiDepotService } from '@/shared/modules/api_depot/api_depot.service';
import { BanPlateformService } from '@/shared/modules/ban_plateform/ban_plateform.service';
import { ValidateurApiService } from '@/shared/modules/validateur_api/validateur_api.service';
import { Inject, Injectable, forwardRef, Logger } from '@nestjs/common';

@Injectable()
export class PopulateService {
  constructor(
    private apiDepotService: ApiDepotService,
    @Inject(forwardRef(() => BanPlateformService))
    private banPlateformService: BanPlateformService,
    private validateurApiService: ValidateurApiService,
    private readonly logger: Logger,
  ) {}

  private async extractFromApiDepot(
    codeCommune: string,
  ): Promise<FromCsvValid> {
    try {
      const file: Buffer =
        await this.apiDepotService.downloadCurrentRevisionFile(codeCommune);
      const report = await this.validateurApiService.validateFile(file);
      const result: FromCsv | FromCsvError | FromCsvValid =
        await extractFromCsv(report, codeCommune);
      if (!result.isValid) {
        throw new Error('Invalid CSV file');
      }

      return result;
    } catch {}
  }

  private async extractFromBAN(codeCommune: string): Promise<FromCsvValid> {
    try {
      const file: Buffer =
        await this.banPlateformService.getBanAssemblage(codeCommune);
      const report = await this.validateurApiService.validateFile(file);
      const result: FromCsv | FromCsvError | FromCsvValid =
        await extractFromCsv(report, codeCommune);
      if (!result.isValid) {
        throw new Error('Invalid CSV file');
      }

      return result;
    } catch {}
  }

  public async extract(codeCommune: string): Promise<FromCsvValid> {
    const data =
      (await this.extractFromApiDepot(codeCommune)) ||
      (await this.extractFromBAN(codeCommune));
    if (data) {
      return data;
    }

    this.logger.error(
      `Aucune adresse n’a pu être extraite avec le code commune: ${codeCommune}`,
      null,
      PopulateService.name,
    );

    return { voies: [], numeros: [], toponymes: [] };
  }
}
