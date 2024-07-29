import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { In, Repository } from 'typeorm';

import { BaseLocale } from '@/shared/entities/base_locale.entity';
import {
  StatusSyncEnum,
  StatusBaseLocalEnum,
} from '@/shared/schemas/base_locale/status.enum';
import { ApiDepotService } from '@/shared/modules/api_depot/api_depot.service';
import { Revision } from '@/shared/modules/api_depot/types/revision.type';

import { Task } from '../task.type';

export const KEY_DETECT_CONFLICT_PUBLISHED_SINCE =
  'detectConflictPublishedSince';

@Injectable()
export class DetectConflictTask implements Task {
  title: string = 'Detect conflict';

  constructor(
    private readonly apiDepotService: ApiDepotService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectRepository(BaseLocale)
    private basesLocalesRepository: Repository<BaseLocale>,
  ) {}

  public async run() {
    const futurePublishedSince = new Date();
    const detectConflictPublishedSince = await this.cacheManager.get<Date>(
      KEY_DETECT_CONFLICT_PUBLISHED_SINCE,
    );
    const currentRevisions: Revision[] =
      await this.apiDepotService.getCurrentRevisions(
        detectConflictPublishedSince,
      );
    const revisedCommunes = currentRevisions.map((r) => r.codeCommune);

    await this.cacheManager.set(
      KEY_DETECT_CONFLICT_PUBLISHED_SINCE,
      futurePublishedSince,
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
