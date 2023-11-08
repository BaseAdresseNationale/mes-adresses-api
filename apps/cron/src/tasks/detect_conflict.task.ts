import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';
import {
  StatusSyncEnum,
  StatusBaseLocalEnum,
} from '@/shared/schemas/base_locale/status.enum';
import { ApiDepotService } from '@/shared/modules/api_depot/api_depot.service';
import { Revision } from '@/shared/modules/api_depot/types/revision.type';
import { CacheService } from '@/shared/modules/cache/cache.service';

const KEY_DETECT_CONFLICT_PUBLISHED_SINCE = 'detectConflictPublishedSince';

@Injectable()
export class DetectConflictTask {
  constructor(
    private readonly apiDepotService: ApiDepotService,
    private readonly cacheService: CacheService,
    @InjectModel(BaseLocale.name) private baseLocaleModel: Model<BaseLocale>,
  ) {}

  public async run() {
    const futurePublishedSince = new Date();
    const detectConflictPublishedSince = await this.cacheService.get(
      KEY_DETECT_CONFLICT_PUBLISHED_SINCE,
    );
    const currentRevisions: Revision[] =
      await this.apiDepotService.getCurrentRevisions(
        detectConflictPublishedSince,
      );
    const revisedCommunes = currentRevisions.map((r) => r.codeCommune);

    await this.cacheService.set(
      KEY_DETECT_CONFLICT_PUBLISHED_SINCE,
      futurePublishedSince,
    );

    await this.wait(5000);

    for (const codeCommune of revisedCommunes) {
      try {
        await this.updateConflictStatus(codeCommune);
      } catch (error) {
        console.error(`Unable to detect conflict for ${codeCommune}`);
        console.error(error);
      }
    }
  }

  private async wait(ms: number): Promise<unknown> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async updateConflictStatus(codeCommune: string) {
    const basesLocales = await this.baseLocaleModel.find({
      commune: codeCommune,
      status: {
        $in: [StatusBaseLocalEnum.REPLACED, StatusBaseLocalEnum.PUBLISHED],
      },
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
      if (
        currentRevision._id ===
        baseLocale.sync.lastUploadedRevisionId.toString()
      ) {
        await this.baseLocaleModel.updateOne(
          { _id: baseLocale._id, status: StatusBaseLocalEnum.REPLACED },
          {
            $set: {
              status: StatusBaseLocalEnum.PUBLISHED,
              'sync.status': StatusSyncEnum.SYNCED,
            },
          },
        );
      } else {
        await this.baseLocaleModel.updateOne(
          { _id: baseLocale._id, status: StatusBaseLocalEnum.PUBLISHED },
          {
            $set: {
              status: StatusBaseLocalEnum.REPLACED,
              'sync.status': StatusSyncEnum.CONFLICT,
            },
          },
        );
      }
    }
  }
}
