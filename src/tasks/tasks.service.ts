import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import {
  detectOutdated,
  detectConflict,
  syncOutdated,
} from '../../legacy-api/sync';
import {
  removeSoftDeletedBALsOlderThanOneYear,
  removeDemoBALsOlderThanAMonth,
} from '../../legacy-api/models/base-locale';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  // Every 30 seconds
  @Interval(30000)
  async detectOutdatedSyncTask() {
    this.logger.debug('Task start : detect outdated sync');
    await detectOutdated();
    this.logger.debug('Task end : detect outdated sync');
  }

  // Every 30 seconds
  @Interval(30000)
  async detectConflictTask() {
    this.logger.debug('Task start : detect sync in conflict');
    await detectConflict();
    this.logger.debug('Task end : detect sync in conflict');
  }

  // Every 5 minutes
  @Interval(300000)
  async syncOutdatedTask() {
    this.logger.debug('Task start : sync outdated');
    await syncOutdated();
    this.logger.debug('Task end : sync outdated');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async removeSoftDeletedBALsOlderThanOneYearTask() {
    this.logger.debug('Task start : purge old deleted BALs');
    await removeSoftDeletedBALsOlderThanOneYear();
    this.logger.debug('Task end : purge old deleted BALs');
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async removeDemoBALsOlderThanAMonthTask() {
    this.logger.debug('Task start : purge demo BALs');
    await removeDemoBALsOlderThanAMonth();
    this.logger.debug('Task end : purge demo BALs');
  }
}
