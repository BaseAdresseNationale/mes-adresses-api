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
    await this.basesLocalesRepository
      .createQueryBuilder('bases_locales')
      .update(BaseLocale)
      // On set sync.status a 'outdated' et sync.currentUpdated a null
      .set({
        sync: () =>
          `sync - 'currentUpdated' || jsonb_build_object(
            'status', '${StatusSyncEnum.OUTDATED}'
          )`,
      })
      // Si sync.status egale SYNCED
      .where(`bases_locales.sync->>'status' = :status`, {
        status: StatusSyncEnum.SYNCED,
      })
      // Et si sync.currentUpdated est inférieur a updatedAt
      .andWhere(
        `(bases_locales.sync->>'currentUpdated')::timestamp < bases_locales.updated_at`,
      )
      .execute();
  }
}
