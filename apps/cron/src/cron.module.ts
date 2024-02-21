import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import {
  BaseLocale,
  BaseLocaleSchema,
} from '@/shared/schemas/base_locale/base_locale.schema';
import { ApiDepotModule } from '@/shared/modules/api_depot/api_depot.module';
import { writeFileSync } from 'node:fs';

import { CronService } from './cron.service';
import { DetectOutdatedTask } from './tasks/detect_outdated.task';
import { DetectConflictTask } from './tasks/detect_conflict.task';
import { CacheModule } from '@/shared/modules/cache/cache.module';
import { PublicationModule } from '@/shared/modules/publication/publication.module';
import { SyncOutdatedTask } from './tasks/sync_outdated.task';
import { Numero, NumeroSchema } from '@/shared/schemas/numero/numero.schema';
import {
  Toponyme,
  ToponymeSchema,
} from '@/shared/schemas/toponyme/toponyme.schema';
import { Voie, VoieSchema } from '@/shared/schemas/voie/voie.schema';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        const options: any = {
          uri: config.get('MONGODB_URL'),
          dbName: config.get('MONGODB_DBNAME'),
        };

        if (config.get('MONGODB_CERTIFICATE')) {
          const path = `${__dirname}/../../certificate.pem`;
          writeFileSync(path, config.get('MONGODB_CERTIFICATE'));
          options.tls = true;
          options.tlsCAFile = path;
          options.authMechanism = 'PLAIN';
          options.tlsInsecure = true;
        }

        return options;
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: BaseLocale.name, schema: BaseLocaleSchema },
      { name: Numero.name, schema: NumeroSchema },
      { name: Toponyme.name, schema: ToponymeSchema },
      { name: Voie.name, schema: VoieSchema },
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
