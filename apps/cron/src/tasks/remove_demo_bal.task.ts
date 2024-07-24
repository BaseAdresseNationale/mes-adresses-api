import { Injectable } from '@nestjs/common';
import { subMonths } from 'date-fns';

import {
  BaseLocale,
  StatusBaseLocalEnum,
} from '@/shared/entities/base_locale.entity';

import { Task } from '../task.type';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, LessThan, Repository } from 'typeorm';

@Injectable()
export class RemoveDemoBalTask implements Task {
  title: string = 'Remove Demo Bal';

  constructor(
    @InjectRepository(BaseLocale)
    private basesLocalesRepository: Repository<BaseLocale>,
  ) {}

  public async run() {
    // On créer le where pour selectioné toutes les BALs DEMO qui on plus d'un mois
    const deleteTime = subMonths(new Date(), 1);
    const where: FindOptionsWhere<BaseLocale> = {
      deletedAt: LessThan(deleteTime),
      status: StatusBaseLocalEnum.DEMO,
    };
    // On supprime les BAL, et par CASCADE les voie, toponymes, numeros et positions sont supprimé également
    await this.basesLocalesRepository.delete(where);
  }
}
