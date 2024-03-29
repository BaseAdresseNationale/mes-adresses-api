import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';
import { StatusSyncEnum } from '@/shared/schemas/base_locale/status.enum';

import { Task } from '../task_queue.class';

@Injectable()
export class DetectOutdatedTask implements Task {
  title: string = 'Detect outdated';

  constructor(
    @InjectModel(BaseLocale.name) private baseLocaleModel: Model<BaseLocale>,
  ) {}

  public async run() {
    await this.baseLocaleModel.updateMany(
      {
        'sync.status': StatusSyncEnum.SYNCED,
        $expr: { $gt: ['$_updated', '$sync.currentUpdated'] },
      },
      {
        $set: { 'sync.status': StatusSyncEnum.OUTDATED },
        $unset: { 'sync.currentUpdated': 1 },
      },
    );
  }
}
