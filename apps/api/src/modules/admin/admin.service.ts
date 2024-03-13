import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';

import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { FusionCommunesDTO } from './dto/fusion_bases_locales.dto';
import { PopulateService } from '../base_locale/sub_modules/populate/populate.service';

@Injectable()
export class AdminService {
  constructor(
    @Inject(forwardRef(() => PopulateService))
    private populateService: PopulateService,
    @Inject(forwardRef(() => BaseLocaleService))
    private baseLocaleService: BaseLocaleService,
  ) {}

  public async fusionCommunes({
    codeCommune,
    nom,
    emails,
    communes,
  }: FusionCommunesDTO): Promise<BaseLocale> {
    const newbaseLocale: BaseLocale = await this.baseLocaleService.createOne(
      { commune: codeCommune, nom, emails },
      false,
    );

    const fusionEmails = emails;
    for (const { codeCommune, balId } of communes) {
      if (balId) {
        const baseLocale: BaseLocale =
          await this.baseLocaleService.findOneOrFail(balId);
        fusionEmails.push(...baseLocale.emails);
        const { numeros, voies, toponymes } =
          await this.baseLocaleService.findMetas(balId);
        await this.baseLocaleService.populate(newbaseLocale, {
          numeros,
          voies,
          toponymes,
        });
      } else {
        const { numeros, voies, toponymes } =
          await this.populateService.extract(codeCommune);
        await this.baseLocaleService.populate(newbaseLocale, {
          numeros,
          voies,
          toponymes,
        });
      }
    }

    await this.baseLocaleService.updateOne(newbaseLocale, {
      emails: fusionEmails,
    });

    return newbaseLocale;
  }
}
