import { extractFromCsv } from '@/lib/utils/csv.utils';
import { ApiDepotService } from '@/shared/modules/api_depot/api_depot.service';
import { BanPlateformService } from '@/shared/modules/ban_plateform/ban_plateform.service';
import { Inject, Injectable, forwardRef } from '@nestjs/common';

@Injectable()
export class PopulateService {
  constructor(
    private apiDepotService: ApiDepotService,
    @Inject(forwardRef(() => BanPlateformService))
    private banPlateformService: BanPlateformService,
  ) {}

  private async extractFromApiDepot(codeCommune: string) {
    try {
      const fileData =
        await this.apiDepotService.downloadCurrentRevisionFile(codeCommune);

      const result = await extractFromCsv(fileData, codeCommune);

      if (!result.isValid) {
        throw new Error('Invalid CSV file');
      }

      return result;
    } catch {}
  }

  private async extractFromBAN(codeCommune: string) {
    try {
      const file: Buffer =
        await this.banPlateformService.getBanAssemblage(codeCommune);

      const result = await extractFromCsv(file, codeCommune);

      if (!result.isValid) {
        throw new Error('Invalid CSV file');
      }

      return result;
    } catch {}
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
