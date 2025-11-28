import { Injectable } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';

import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PriorityEnum, TaskTitle } from '@/shared/types/task.type';
import { QUEUE_NAME } from '@/shared/params/queue_name.const';

@Injectable()
export class ScheduleTaskService {
  constructor(@InjectQueue(QUEUE_NAME) private taskQueue: Queue) {}

  // Every 30 seconds
  @Interval(30000)
  async detectOutdated() {
    // Met le status de sync a OUTDATED si il y a eu un changement
    await this.taskQueue.add(
      TaskTitle.DETECT_OUTDATED,
      {},
      { priority: PriorityEnum.LOW },
    );
  }

  // Every 30 seconds
  @Interval(30000)
  async detectConflict() {
    // Met le status a published (synced) si la derniere revision a le même id que le lastUploadedRevisionId du sync
    // sinon met le status a replaced (conflict)
    await this.taskQueue.add(
      TaskTitle.DETECT_CONFLICT,
      {},
      { priority: PriorityEnum.LOW },
    );
  }

  // Every 5 minutes
  @Interval(300000)
  async syncOutdated() {
    // Lance la publication de toutes les bals dont le sync est OUTDATED dans les 2 dernières heures
    await this.taskQueue.add(
      TaskTitle.SYNC_OUTDATED,
      {},
      { priority: PriorityEnum.LOW },
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async removeSoftDeletedBALsOlderThanOneYear() {
    await this.taskQueue.add(
      TaskTitle.REMOVE_SOFT_DELETE_BAL,
      {},
      { priority: PriorityEnum.LOW },
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async removeDemoBALsOlderThanAMonth() {
    await this.taskQueue.add(
      TaskTitle.REMOVE_DEMO_BAL,
      {},
      { priority: PriorityEnum.LOW },
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async uploadTraces() {
    await this.taskQueue.add(
      TaskTitle.UPLOAD_TRACES,
      {},
      { priority: PriorityEnum.LOW },
    );
  }

  @Cron(CronExpression.EVERY_WEEK)
  async resetCommunesForWebinaire() {
    await this.taskQueue.add(
      TaskTitle.RESET_COMMUNES_FOR_WEBINAIRE,
      {},
      { priority: PriorityEnum.LOW },
    );
  }
}
