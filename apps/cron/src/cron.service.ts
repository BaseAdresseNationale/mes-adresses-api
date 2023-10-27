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
export class CronService {
  private readonly logger = new Logger(CronService.name);

  // Every 30 seconds
  @Interval(30000)
  async detectOutdatedSyncTask() {
    this.logger.debug('Task start : detect outdated sync');
    // GET TOUTES LES BALS AVEC LE sync.status = SYNCED QUI ONT UN UPDATED SUPPERIEUR AU sync.currentUpdated
    // ET SET sync.status = OUTDATED et UNSET sync.currentUpdated DE CELLE DERNIERE
    await detectOutdated();
    this.logger.debug('Task end : detect outdated sync');
  }

  // Every 30 seconds
  @Interval(30000)
  async detectConflictTask() {
    this.logger.debug('Task start : detect sync in conflict');
    // RECUPERE TOUTE LES REVISIONS COURRANTE DE L'API DE DEPOT
    // COMPARE TOUTES LES BALS DES CODES COMMUNES DES REVISIONS
    // SET LE STATUS A published et sync.status a SYNCED SI LE sync.lastUploadedRevisionId = revision._id ET QUE SONT status = REPLACED
    // SET LE STATUS A replaced et sync.status a CONFLICT SI LE sync.lastUploadedRevisionId != revision._id ET QUE SONT status = PUBLISHED
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

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
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
