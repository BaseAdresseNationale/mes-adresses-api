import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ObjectId } from 'bson';

import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { FusionCommunesDTO } from './dto/fusion_bases_locales.dto';
import { PopulateService } from '../base_locale/sub_modules/populate/populate.service';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { Numero } from '@/shared/entities/numero.entity';
import { VoieService } from '../voie/voie.service';
import { ToponymeService } from '../toponyme/toponyme.service';
import { NumeroService } from '../numeros/numero.service';

@Injectable()
export class AdminService {
  constructor(
    @Inject(forwardRef(() => PopulateService))
    private populateService: PopulateService,
    @Inject(forwardRef(() => BaseLocaleService))
    private baseLocaleService: BaseLocaleService,
    @Inject(forwardRef(() => VoieService))
    private voieService: VoieService,
    @Inject(forwardRef(() => ToponymeService))
    private toponymeService: ToponymeService,
    @Inject(forwardRef(() => NumeroService))
    private numeroService: NumeroService,
  ) {}

  private replaceBalIds(
    bal: BaseLocale,
    codeCommune: string,
    voies: Voie[],
    toponymes: Toponyme[],
    numeros: Numero[],
  ) {
    const idVoies = {};
    const idToponymes = {};

    for (const voie of voies) {
      voie.balId = bal.id;
      const newId = new ObjectId().toHexString();
      idVoies[voie.id] = newId;
      voie.id = newId;
    }

    for (const toponyme of toponymes) {
      toponyme.balId = bal.id;
      const newId = new ObjectId().toHexString();
      idToponymes[toponyme.id] = newId;
      toponyme.id = newId;
    }

    for (const numero of numeros) {
      numero.balId = bal.id;
      numero.id = new ObjectId().toHexString();
      numero.voieId = idVoies[numero.voieId];
      numero.toponymeId = numero.toponymeId
        ? idToponymes[numero.toponymeId]
        : null;
      numero.communeDeleguee = codeCommune;
    }
  }

  private setNumeroCommuneDeleguee(
    codeCommune: string,
    numeros: Partial<Numero>[],
  ) {
    for (const numero of numeros) {
      numero.communeDeleguee = codeCommune;
    }
  }

  public async fusionCommunes({
    codeCommune,
    nom,
    emails,
    communes,
  }: FusionCommunesDTO): Promise<BaseLocale> {
    const newbaseLocale: BaseLocale = await this.baseLocaleService.createOne({
      commune: codeCommune,
      nom,
      emails,
    });
    for (const { codeCommune, balId } of communes) {
      if (balId) {
        const voies = await this.voieService.findMany({ balId });
        const toponymes = await this.toponymeService.findMany({ balId });
        const numeros = await this.numeroService.findMany({ balId });
        this.replaceBalIds(
          newbaseLocale,
          codeCommune,
          voies,
          toponymes,
          numeros,
        );
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
        this.setNumeroCommuneDeleguee(codeCommune, numeros);
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
