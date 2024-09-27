import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import {
  BaseLocale,
  StatusSyncEnum,
  StatusBaseLocalEnum,
} from '@/shared/entities/base_locale.entity';
import { ApiDepotService } from '@/shared/modules/api_depot/api_depot.service';
import { Revision } from '@/shared/modules/api_depot/types/revision.type';

import { Task } from '../task_queue.class';
import { CacheService } from '@/shared/modules/cache/cache.service';

export const KEY_DETECT_CONFLICT_PUBLISHED_SINCE =
  'detectConflictPublishedSince';

@Injectable()
export class DetectConflictTask implements Task {
  title: string = 'Detect conflict';

  constructor(
    private readonly apiDepotService: ApiDepotService,
    @InjectRepository(BaseLocale)
    private basesLocalesRepository: Repository<BaseLocale>,
    private cacheService: CacheService,
  ) {}

  public async run() {
    const futurePublishedSince = new Date();
    const cache = await this.cacheService.get(
      KEY_DETECT_CONFLICT_PUBLISHED_SINCE,
    );
    const detectConflictPublishedSince = new Date(cache?.value || '1970-01-01');
    console.log('Detect conflict since : ', detectConflictPublishedSince);
    const currentRevisions: Revision[] =
      await this.apiDepotService.getCurrentRevisions(
        detectConflictPublishedSince,
      );
    console.log(
      'Number of current revisions processed : ',
      currentRevisions.length,
    );
    const revisedCommunes = currentRevisions.map((r) => r.codeCommune);

    await this.cacheService.set(
      KEY_DETECT_CONFLICT_PUBLISHED_SINCE,
      futurePublishedSince.toISOString(),
    );

    for (const codeCommune of revisedCommunes) {
      try {
        await this.updateConflictStatus(codeCommune);
      } catch (error) {
        console.error(`Unable to detect conflict for ${codeCommune}`, error);
      }
    }
  }

  private async updateConflictStatus(codeCommune: string) {
    const basesLocales = await this.basesLocalesRepository.findBy({
      commune: codeCommune,
      status: In([StatusBaseLocalEnum.REPLACED, StatusBaseLocalEnum.PUBLISHED]),
    });

    if (basesLocales.length === 0) {
      return;
    }

    const currentRevision: Revision =
      await this.apiDepotService.getCurrentRevision(codeCommune);

    if (!currentRevision) {
      console.error(
        `Comportement inattendu : pas de révision courante pour la commune ${codeCommune}`,
      );
      return;
    }

    for (const baseLocale of basesLocales) {
      if (currentRevision._id === baseLocale.sync.lastUploadedRevisionId) {
        await this.basesLocalesRepository.update(
          {
            id: baseLocale.id,
            status: StatusBaseLocalEnum.REPLACED,
          },
          {
            status: StatusBaseLocalEnum.PUBLISHED,
            sync: { status: StatusSyncEnum.SYNCED },
          },
        );
      } else {
        await this.basesLocalesRepository.update(
          {
            id: baseLocale.id,
            status: StatusBaseLocalEnum.PUBLISHED,
          },
          {
            status: StatusBaseLocalEnum.REPLACED,
            sync: { status: StatusSyncEnum.CONFLICT },
          },
        );
      }
    }
  }
}
