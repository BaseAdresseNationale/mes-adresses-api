import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ObjectId } from 'bson';
import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { Voie } from '@/shared/schemas/voie/voie.schema';
import { Numero } from '@/shared/schemas/numero/numero.schema';
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

  private replaceBalIds(
    bal: BaseLocale,
    voies: Voie[],
    toponymes: Toponyme[],
    numeros: Numero[],
  ) {
    const idVoies = {};
    const idToponymes = {};

    for (const voie of voies) {
      voie._bal = bal._id;
      voie.commune = bal.commune;
      const newId = new ObjectId();
      idVoies[voie._id.toHexString()] = newId;
      voie._id = newId;
    }

    for (const toponyme of toponymes) {
      toponyme._bal = bal._id;
      toponyme.commune = bal.commune;
      const newId = new ObjectId();
      idToponymes[toponyme._id.toHexString()] = newId;
      toponyme._id = newId;
    }

    for (const numero of numeros) {
      numero._bal = bal._id;
      numero.commune = bal.commune;
      numero._id = new ObjectId();
      numero.voie = idVoies[numero.voie.toHexString()];
      numero.toponyme = numero.toponyme
        ? idToponymes[numero.toponyme.toHexString()]
        : null;
    }
  }

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
    for (const { codeCommune, balId } of communes) {
      if (balId) {
        const { numeros, voies, toponymes } =
          await this.baseLocaleService.findMetas(balId);
        this.replaceBalIds(newbaseLocale, voies, toponymes, numeros);
        await this.baseLocaleService.populate(
          newbaseLocale,
          {
            numeros,
            voies,
            toponymes,
          },
          false,
        );
      } else {
        const { numeros, voies, toponymes } =
          await this.populateService.extract(codeCommune);
        await this.baseLocaleService.populate(
          newbaseLocale,
          {
            numeros,
            voies,
            toponymes,
          },
          false,
        );
      }
    }

    return newbaseLocale;
  }
}
