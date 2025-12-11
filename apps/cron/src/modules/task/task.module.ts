import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicationModule } from '@/shared/modules/publication/publication.module';
import { ApiDepotModule } from '@/shared/modules/api_depot/api_depot.module';
import { CacheModule } from '@/shared/modules/cache/cache.module';
import { S3Module } from '@/shared/modules/s3/s3.module';

import { TaskProcessor } from './task.processor';
import { DetectOutdatedTask } from './tasks/detect_outdated.task';
import { SyncOutdatedTask } from './tasks/sync_outdated.task';
import { DetectConflictTask } from './tasks/detect_conflict.task';
import { RemoveSoftDeleteBalTask } from './tasks/remove_soft_delete_bal.task';
import { RemoveDemoBalTask } from './tasks/remove_demo_bal.task';
import { UploadTracesTask } from './tasks/upload_traces.task';
import { QUEUE_NAME } from '@/shared/params/queue_name.const';
import { ForcePublishTask } from './tasks/force_publish.task';
import { ResetCommunesForWebinaireTask } from './tasks/reset_communes_for_webinaire.task';

@Module({
  imports: [
    ConfigModule.forRoot(),
    BullModule.registerQueue({
      name: QUEUE_NAME,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
    TypeOrmModule.forFeature([BaseLocale, Voie]),
    PublicationModule,
    ApiDepotModule,
    CacheModule,
    S3Module,
  ],
  providers: [
    Logger,
    TaskProcessor,
    DetectOutdatedTask,
    SyncOutdatedTask,
    DetectConflictTask,
    RemoveSoftDeleteBalTask,
    RemoveDemoBalTask,
    UploadTracesTask,
    ForcePublishTask,
    ResetCommunesForWebinaireTask,
  ],
})
export class TaskModule {}
