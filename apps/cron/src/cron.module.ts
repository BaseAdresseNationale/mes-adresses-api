import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import {
  BaseLocale,
  BaseLocaleSchema,
} from '@/shared/schemas/base_locale/base_locale.schema';
import { ApiDepotModule } from '@/shared/modules/api_depot/api_depot.module';

import { CronService } from './cron.service';
import { DetectOutdatedTask } from './tasks/detect_outdated.task';
import { DetectConflictTask } from './tasks/detect_conflict.task';
import { CacheModule } from '@/shared/modules/cache/cache.module';
import { PublicationModule } from '@/shared/modules/publication/publication.module';
import { SyncOutdatedTask } from './tasks/sync_outdated.task';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        uri: config.get('MONGODB_URL'),
        dbName: config.get('MONGODB_DBNAME'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: BaseLocale.name, schema: BaseLocaleSchema },
    ]),
    ScheduleModule.forRoot(),
    ApiDepotModule,
    CacheModule,
    PublicationModule,
  ],
  providers: [
    CronService,
    DetectOutdatedTask,
    DetectConflictTask,
    SyncOutdatedTask,
  ],
})
export class CronModule {}
