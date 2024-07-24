import { Injectable } from '@nestjs/common';
import {
  BaseLocale,
  StatusSyncEnum,
} from '@/shared/entities/base_locale.entity';

import { Task } from '../task.type';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class DetectOutdatedTask implements Task {
  title: string = 'Detect outdated';

  constructor(
    @InjectRepository(BaseLocale)
    private basesLocalesRepository: Repository<BaseLocale>,
  ) {}

  public async run() {
    this.basesLocalesRepository
      .createQueryBuilder('base_locale')
      .update(BaseLocale)
      // On set sync.status a OUTDATED
      .set({
        sync: () => `jsonb_set(sync,status,${StatusSyncEnum.OUTDATED})`,
      })
      // On set sync.currentUpdated a null
      .set({
        sync: () => `jsonb_set(sync,currentUpdated,null)`,
      })
      // Si sync.status egale SYNCED
      .where(`base_locale.sync->>'status' :status`, {
        status: StatusSyncEnum.SYNCED,
      })
      // Et si sync.currentUpdated est inférieur a updatedAt
      .andWhere(`base_locale.sync->>'currentUpdated' < base_locale.updatedAt`)
      .execute();
  }
}
