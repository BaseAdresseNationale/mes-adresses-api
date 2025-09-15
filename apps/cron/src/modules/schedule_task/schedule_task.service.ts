import { Injectable } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';

import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Priority, TaskTitle } from '@/shared/types/task.type';

@Injectable()
export class ScheduleTaskService {
  constructor(@InjectQueue('task') private audioQueue: Queue) {
    this.detectOutdated();
  }

  // Every 30 seconds
  @Interval(30000)
  async detectOutdated() {
    // Met le status de sync a OUTDATED si il y a eu un changement
    await this.audioQueue.add(
      TaskTitle.DETECT_OUTDATED,
      {},
      { priority: Priority.LOW },
    );
  }

  // Every 30 seconds
  @Interval(30000)
  async detectConflict() {
    // Met le status a published (synced) si la derniere revision a le même id que le lastUploadedRevisionId du sync
    // sinon met le status a replaced (conflict)
    await this.audioQueue.add(
      TaskTitle.DETECT_CONFLICT,
      {},
      { priority: Priority.LOW },
    );
  }

  // Every 5 minutes
  @Interval(300000)
  async syncOutdated() {
    // Lance la publication de toutes les bals dont le sync est OUTDATED dans les 2 dernières heures
    await this.audioQueue.add(
      TaskTitle.SYNC_OUTDATED,
      {},
      { priority: Priority.LOW },
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async removeSoftDeletedBALsOlderThanOneYear() {
    await this.audioQueue.add(
      TaskTitle.REMOVE_SOFT_DELETE_BAL,
      {},
      { priority: Priority.LOW },
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async removeDemoBALsOlderThanAMonth() {
    await this.audioQueue.add(
      TaskTitle.REMOVE_DEMO_BAL,
      {},
      { priority: Priority.LOW },
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async uploadTraces() {
    await this.audioQueue.add(
      TaskTitle.UPLOAD_TRACES,
      {},
      { priority: Priority.LOW },
    );
  }
}
