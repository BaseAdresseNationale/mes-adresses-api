import { Injectable } from '@nestjs/common';

import { Numero } from '@/shared/entities/numero.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { exportBalToCsv } from '@/shared/modules/export_csv/utils/export_csv_bal.utils';
import { exportVoiesToCsv } from '@/shared/modules/export_csv/utils/export_csv_voies.utils';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ExportCsvService {
  constructor(
    @InjectRepository(Numero)
    private numerosRepository: Repository<Numero>,
    @InjectRepository(Voie)
    private voiesRepository: Repository<Voie>,
    @InjectRepository(Toponyme)
    private toponymesRepository: Repository<Toponyme>,
  ) {}

  async getAllFromBal(balId: string) {
    const voies: Voie[] = await this.voiesRepository.find({
      where: {
        balId,
        deletedAt: null,
      },
      order: {
        nom: 'ASC',
      },
    });
    const toponymes: Toponyme[] = await this.toponymesRepository.find({
      where: {
        balId,
        deletedAt: null,
      },
      order: {
        nom: 'ASC',
      },
    });
    const numeros: Numero[] = await this.numerosRepository.find({
      where: {
        balId,
        deletedAt: null,
      },
      order: {
        numero: 'ASC',
        suffixe: {
          direction: 'ASC',
          nulls: 'FIRST',
        },
      },
    });
    return { voies, toponymes, numeros };
  }

  async exportToCsv(
    baseLocale: BaseLocale,
    params: { withComment?: boolean; withId?: boolean } = {},
  ): Promise<string> {
    const { voies, toponymes, numeros } = await this.getAllFromBal(
      baseLocale.id,
    );
    return exportBalToCsv(baseLocale, voies, toponymes, numeros, params);
  }

  async exportVoiesToCsv(baseLocale: BaseLocale): Promise<string> {
    const { voies, toponymes, numeros } = await this.getAllFromBal(
      baseLocale.id,
    );

    return exportVoiesToCsv(voies, toponymes, numeros);
  }
}
