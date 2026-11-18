import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from './queue.class';
import { RemoveSoftDeleteBalTask } from './tasks/remove_soft_delete_bal.task';
import { RemoveDemoBalTask } from './tasks/remove_demo_bal.task';
import { UploadTracesTask } from './tasks/upload_traces.task';
import { ResetCommunesForWebinaireTask } from './tasks/reset_communes_for_webinaire.task';

@Injectable()
export class CronService {
  private queue: Queue = new Queue();

  constructor(
    private readonly removeSoftDeleteBalTask: RemoveSoftDeleteBalTask,
    private readonly removeDemoBalTask: RemoveDemoBalTask,
    private readonly uploadTracesTask: UploadTracesTask,
    private readonly resetCommunesForWebinaireTask: ResetCommunesForWebinaireTask,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async removeSoftDeletedBALsOlderThanOneYear() {
    this.queue.pushTask(this.removeSoftDeleteBalTask);
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async removeDemoBALsOlderThanAMonth() {
    this.queue.pushTask(this.removeDemoBalTask);
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async uploadTraces() {
    this.queue.pushTask(this.uploadTracesTask);
  }

  @Cron(CronExpression.EVERY_WEEK)
  async resetCommunesForWebinaire() {
    this.queue.pushTask(this.resetCommunesForWebinaireTask);
  }
}
