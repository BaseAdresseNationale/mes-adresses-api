import { Injectable } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';

import { DetectOutdatedTask } from './tasks/detect_outdated.task';
import { DetectConflictTask } from './tasks/detect_conflict.task';
import { SyncOutdatedTask } from './tasks/sync_outdated.task';
import { TaskQueue } from './task_queue.class';
import { RemoveSoftDeleteBalTask } from './tasks/remove_soft_delete_bal.task';
import { RemoveDemoBalTask } from './tasks/remove_demo_bal.task';
import { UploadTracesTask } from './tasks/upload_traces.task';

@Injectable()
export class CronService {
  private queue: TaskQueue = new TaskQueue();

  constructor(
    private readonly detectOutdatedTask: DetectOutdatedTask,
    private readonly detectConflictTask: DetectConflictTask,
    private readonly syncOutdatedTask: SyncOutdatedTask,
    private readonly removeSoftDeleteBalTask: RemoveSoftDeleteBalTask,
    private readonly removeDemoBalTask: RemoveDemoBalTask,
    private readonly uploadTracesTask: UploadTracesTask,
  ) {}

  // Every 30 seconds
  @Interval(30000)
  async detectOutdated() {
    // Met le status de sync a OUTDATED si il y a eu un changement
    this.queue.pushTask(this.detectOutdatedTask);
  }

  // Every 30 seconds
  @Interval(30000)
  async detectConflict() {
    // Met le status a published (synced) si la derniere revision a le même id que le lastUploadedRevisionId du sync
    // sinon met le status a replaced (conflict)
    this.queue.pushTask(this.detectConflictTask);
  }

  // Every 5 minutes
  @Interval(300000)
  async syncOutdated() {
    // Lance la publication de toutes les bals dont le sync est OUTDATED dans les 2 dernières heures
    this.queue.pushTask(this.syncOutdatedTask);
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async removeSoftDeletedBALsOlderThanOneYear() {
    this.queue.pushTask(this.removeSoftDeleteBalTask);
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async removeDemoBALsOlderThanAMonth() {
    this.queue.pushTask(this.removeDemoBalTask);
  }

  // Sunday at 3am
  @Cron('0 3 * * 0')
  async uploadTraces() {
    this.queue.pushTask(this.uploadTracesTask);
  }
}
