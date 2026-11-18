import { Injectable } from '@nestjs/common';

import { Numero } from '@/shared/entities/numero.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Event } from '@/shared/entities/event.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { applyEventsRollback } from './utils/rollback_events.utils';
import { exportBalToCsv } from './utils/export_csv_bal.utils';
import { exportVoiesToCsv } from './utils/export_csv_voies.utils';

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
      },
      order: {
        nom: 'ASC',
      },
    });
    const toponymes: Toponyme[] = await this.toponymesRepository.find({
      where: {
        balId,
      },
      order: {
        nom: 'ASC',
      },
    });
    const numeros: Numero[] = await this.numerosRepository.find({
      where: {
        balId,
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
    withComment: boolean = false,
    ignoredEvents: Event[] = [],
  ): Promise<string> {
    const { voies, toponymes, numeros } = await this.getAllFromBal(
      baseLocale.id,
    );
    const rolledBack = applyEventsRollback(
      { voies, toponymes, numeros },
      ignoredEvents,
    );

    return exportBalToCsv(
      baseLocale,
      rolledBack.voies,
      rolledBack.toponymes,
      rolledBack.numeros,
      withComment,
    );
  }

  async exportVoiesToCsv(baseLocale: BaseLocale): Promise<string> {
    const { voies, toponymes, numeros } = await this.getAllFromBal(
      baseLocale.id,
    );

    return exportVoiesToCsv(voies, toponymes, numeros);
  }
}
