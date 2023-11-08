import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { sub } from 'date-fns';

import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';
import { StatusSyncEnum } from '@/shared/schemas/base_locale/status.enum';
import { PublicationService } from '@/shared/modules/publication/publication.service';

@Injectable()
export class SyncOutdatedTask {
  constructor(
    private readonly publicationService: PublicationService,
    @InjectModel(BaseLocale.name) private baseLocaleModel: Model<BaseLocale>,
  ) {}

  public async run() {
    const timeLimit: Date = sub(new Date(), { hours: 2 });

    const idsToSync: Types.ObjectId[] = await this.baseLocaleModel.distinct(
      '_id',
      {
        'sync.status': StatusSyncEnum.OUTDATED,
        _updated: { $lt: timeLimit },
      },
    );

    for (const balId of idsToSync) {
      try {
        await this.publicationService.exec(balId);
      } catch (error) {
        console.error(`Unable to sync ${balId}`);
        console.error(error);
      }
    }
  }
}
