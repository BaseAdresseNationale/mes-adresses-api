import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Start1721638331361 } from '../../../migrations/1721638331361-start';
import { Emails1721720531648 } from '../../../migrations/1721720531648-emails';
import { Emails1721737016715 } from '../../../migrations/1721737016715-emails';
import { CacheModule } from '@/shared/modules/cache/cache.module';
import { PublicationModule } from '@/shared/modules/publication/publication.module';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { ApiDepotModule } from '@/shared/modules/api_depot/api_depot.module';
import { Voie } from '@/shared/entities/voie.entity';
import { Numero } from '@/shared/entities/numero.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { Position } from '@/shared/entities/position.entity';

import { DetectOutdatedTask } from './tasks/detect_outdated.task';
import { DetectConflictTask } from './tasks/detect_conflict.task';
import { SyncOutdatedTask } from './tasks/sync_outdated.task';
import { MailerParams } from '@/shared/params/mailer.params';
import { RemoveSoftDeleteBalTask } from './tasks/remove_soft_delete_bal.task';
import { RemoveDemoBalTask } from './tasks/remove_demo_bal.task';

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
        migrationsRun: true,
        migrations: [
          Start1721638331361,
          Emails1721720531648,
          Emails1721737016715,
        ],
        entities: [BaseLocale, Voie, Numero, Toponyme, Position],
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([BaseLocale]),
    MailerModule.forRootAsync(MailerParams),
    ScheduleModule.forRoot(),
    ApiDepotModule,
    // CacheModule,
    PublicationModule,
  ],
  providers: [
    DetectOutdatedTask,
    SyncOutdatedTask,
    RemoveSoftDeleteBalTask,
    RemoveDemoBalTask,
  ],
})
export class CronModule {}
