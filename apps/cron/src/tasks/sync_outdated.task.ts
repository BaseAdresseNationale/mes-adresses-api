import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, JsonContains, LessThan, Repository } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { sub } from 'date-fns';

import {
  BaseLocale,
  StatusSyncEnum,
} from '@/shared/entities/base_locale.entity';
import { PublicationService } from '@/shared/modules/publication/publication.service';

import { Task } from '../task_queue.class';

@Injectable()
export class SyncOutdatedTask implements Task {
  title: string = 'Sync outdated';

  constructor(
    @InjectRepository(BaseLocale)
    private basesLocalesRepository: Repository<BaseLocale>,
    private readonly publicationService: PublicationService,
    private readonly logger: Logger,
  ) {}

  public async run() {
    const timeLimit: Date = sub(new Date(), { hours: 2 });
    const where: FindOptionsWhere<BaseLocale> = {
      updatedAt: LessThan(timeLimit),
      sync: JsonContains({
        status: StatusSyncEnum.OUTDATED,
        isPaused: false,
      }),
    };

    const bals: BaseLocale[] = await this.basesLocalesRepository.findBy(where);

    this.logger.log(
      `Number of outdated bases locales to sync : ${bals.length}`,
      SyncOutdatedTask.name,
    );

    for (const bal of bals) {
      try {
        this.logger.log(`Syncing BAL : ${bal.id}`, SyncOutdatedTask.name);
        await this.publicationService.exec(bal.id);
      } catch (error) {
        this.logger.error(
          `Unable to sync BAL : ${bal.id}`,
          error,
          SyncOutdatedTask.name,
        );
      }
    }
  }
}
