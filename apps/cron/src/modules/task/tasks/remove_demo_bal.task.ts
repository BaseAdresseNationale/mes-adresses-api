import { Injectable } from '@nestjs/common';
import { subMonths } from 'date-fns';

import {
  BaseLocale,
  StatusBaseLocalEnum,
} from '@/shared/entities/base_locale.entity';

import { Task } from '@/shared/types/task.type';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, LessThan, Repository } from 'typeorm';

@Injectable()
export class RemoveDemoBalTask implements Task {
  constructor(
    @InjectRepository(BaseLocale)
    private basesLocalesRepository: Repository<BaseLocale>,
  ) {}

  public async run() {
    // On créer le where pour selectioné toutes les BALs DEMO qui ont été créé il y a plus d'un mois
    const createdTime = subMonths(new Date(), 1);
    const where: FindOptionsWhere<BaseLocale> = {
      createdAt: LessThan(createdTime),
      status: StatusBaseLocalEnum.DEMO,
    };
    // On supprime les BAL, et par CASCADE les voie, toponymes, numeros et positions sont supprimé également
    await this.basesLocalesRepository.delete(where);
  }
}
