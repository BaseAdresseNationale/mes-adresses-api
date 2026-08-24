import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Numero } from '@/shared/entities/numero.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { Position } from '@/shared/entities/position.entity';
import { Cache } from '@/shared/entities/cache.entity';
import { CronService } from './cron.service';
import { RemoveSoftDeleteBalTask } from './tasks/remove_soft_delete_bal.task';
import { RemoveDemoBalTask } from './tasks/remove_demo_bal.task';
import { UploadTracesTask } from './tasks/upload_traces.task';
import { ResetCommunesForWebinaireTask } from './tasks/reset_communes_for_webinaire.task';
import { S3Module } from '@/shared/modules/s3/s3.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('POSTGRES_URL'),
        keepConnectionAlive: true,
        schema: 'public',
        entities: [BaseLocale, Voie, Numero, Toponyme, Position, Cache],
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([BaseLocale]),
    TypeOrmModule.forFeature([Voie]),
    S3Module,
  ],
  providers: [
    CronService,
    RemoveSoftDeleteBalTask,
    RemoveDemoBalTask,
    UploadTracesTask,
    ResetCommunesForWebinaireTask,
    Logger,
  ],
})
export class CronModule {}
