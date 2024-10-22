import { Logger, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PublicationModule } from '@/shared/modules/publication/publication.module';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { ApiDepotModule } from '@/shared/modules/api_depot/api_depot.module';
import { Voie } from '@/shared/entities/voie.entity';
import { Numero } from '@/shared/entities/numero.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { Position } from '@/shared/entities/position.entity';
import { Cache } from '@/shared/entities/cache.entity';

import { DetectOutdatedTask } from './tasks/detect_outdated.task';
import { DetectConflictTask } from './tasks/detect_conflict.task';
import { SyncOutdatedTask } from './tasks/sync_outdated.task';
import { MailerParams } from '@/shared/params/mailer.params';
import { RemoveSoftDeleteBalTask } from './tasks/remove_soft_delete_bal.task';
import { RemoveDemoBalTask } from './tasks/remove_demo_bal.task';
import { CronService } from './cron.service';
import { CacheModule } from '@/shared/modules/cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('POSTGRES_URL'),
        keepConnectionAlive: true,
        schema: 'public',
        entities: [BaseLocale, Voie, Numero, Toponyme, Position, Cache],
      }),
      inject: [ConfigService],
    }),

    TypeOrmModule.forFeature([BaseLocale]),
    MailerModule.forRootAsync(MailerParams),
    ScheduleModule.forRoot(),
    ApiDepotModule,
    PublicationModule,
    CacheModule,
  ],
  providers: [
    CronService,
    DetectOutdatedTask,
    SyncOutdatedTask,
    DetectConflictTask,
    RemoveSoftDeleteBalTask,
    RemoveDemoBalTask,
    Logger,
  ],
})
export class CronModule {}
