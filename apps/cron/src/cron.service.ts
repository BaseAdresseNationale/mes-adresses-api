import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { FilterQuery, Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { subMonths } from 'date-fns';

import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';
import { StatusBaseLocalEnum } from '@/shared/schemas/base_locale/status.enum';
import { Numero } from '@/shared/schemas/numero/numero.schema';
import { Voie } from '@/shared/schemas/voie/voie.schema';
import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';

import { DetectOutdatedTask } from './tasks/detect_outdated.task';
import { DetectConflictTask } from './tasks/detect_conflict.task';
import { SyncOutdatedTask } from './tasks/sync_outdated.task';
import { TaskQueue } from './task_queue.class';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  private queue: TaskQueue = new TaskQueue();

  constructor(
    @InjectModel(BaseLocale.name) private baseLocaleModel: Model<BaseLocale>,
    @InjectModel(Numero.name) private numeroModel: Model<Numero>,
    @InjectModel(Voie.name) private voieModel: Model<Voie>,
    @InjectModel(Toponyme.name) private toponymeModel: Model<Toponyme>,
    private readonly detectOutdatedTask: DetectOutdatedTask,
    private readonly detectConflictTask: DetectConflictTask,
    private readonly syncOutdatedTask: SyncOutdatedTask,
  ) {}

  // Every 30 seconds
  @Interval(10000)
  async detectOutdated() {
    // this.logger.debug('Task start : detect outdated sync');
    // Met le status de sync a OUTDATED si il y a eu un changement
    this.queue.pushTask(this.detectOutdatedTask);
    // this.logger.debug('Task end : detect outdated sync');
  }

  // Every 30 seconds
  @Interval(10000)
  async detectConflict() {
    // this.logger.debug('Task start : detect sync in conflict');
    // Met le status a published (synced) si la derniere revision a le même id que le lastUploadedRevisionId du sync
    // sinon met le status a replaced (conflict)
    this.queue.pushTask(this.detectConflictTask);
    // this.logger.debug('Task end : detect sync in conflict');
  }

  // Every 5 minutes
  @Interval(300000)
  async syncOutdated() {
    // this.logger.debug('Task start : sync outdated');
    // Lance la publication de toutes les bals dont le sync est OUTDATED dans les 2 dernières heures
    this.queue.pushTask(this.syncOutdatedTask);
    // this.logger.debug('Task end : sync outdated');
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async removeSoftDeletedBALsOlderThanOneYear() {
    this.logger.debug('Task start : purge old deleted BALs');
    const deleteTime = subMonths(new Date(), 12);
    const filter: FilterQuery<BaseLocale> = { _deleted: { $lt: deleteTime } };
    await this.removeBals(filter);
    this.logger.debug('Task end : purge old deleted BALs');
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async removeDemoBALsOlderThanAMonth() {
    this.logger.debug('Task start : purge demo BALs');
    const creationTime = subMonths(new Date(), 1);
    const filter: FilterQuery<BaseLocale> = {
      status: StatusBaseLocalEnum.DEMO,
      _created: { $lt: creationTime },
    };
    await this.removeBals(filter);
    this.logger.debug('Task end : purge demo BALs');
  }

  private async removeBals(filter: FilterQuery<BaseLocale>) {
    const balIds: Types.ObjectId[] = await this.baseLocaleModel.distinct(
      '_id',
      filter,
    );

    for (const balId of balIds) {
      await this.toponymeModel.deleteMany({ _bal: balId });
      await this.numeroModel.deleteMany({ _bal: balId });
      await this.voieModel.deleteMany({ _bal: balId });
      await this.baseLocaleModel.deleteOne({ _id: balId });
    }

    console.log(`${balIds.length} BALs supprimées définitivement`);
  }
}
