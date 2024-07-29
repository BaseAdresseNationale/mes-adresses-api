import { Injectable } from '@nestjs/common';
import { subMonths } from 'date-fns';

import { BaseLocale } from '@/shared/entities/base_locale.entity';

import { Task } from '../task_queue.class';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, LessThan, Repository } from 'typeorm';

@Injectable()
export class RemoveSoftDeleteBalTask implements Task {
  title: string = 'Remove Soft Delete Bal';

  constructor(
    @InjectRepository(BaseLocale)
    private basesLocalesRepository: Repository<BaseLocale>,
  ) {}

  public async run() {
    // On créer le where pour selectioné toutes les BALs qui sont supprimer depuis plus d'un an
    const deleteTime = subMonths(new Date(), 12);
    const where: FindOptionsWhere<BaseLocale> = {
      deletedAt: LessThan(deleteTime),
    };
    // On supprime les BAL, et par CASCADE les voie, toponymes, numeros et positions sont supprimé également
    await this.basesLocalesRepository.delete(where);
  }
}
