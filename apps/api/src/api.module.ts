import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Numero } from '@/shared/entities/numero.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { Position } from '@/shared/entities/position.entity';
import { Cache } from '@/shared/entities/cache.entity';

import { NumeroModule } from './modules/numeros/numero.module';
import { BaseLocaleModule } from './modules/base_locale/base_locale.module';
import { VoieModule } from './modules/voie/voie.module';
import { ToponymeModule } from './modules/toponyme/toponyme.module';
import { StatsModule } from './modules/stats/stats.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailerParams } from '@/shared/params/mailer.params';
import { AdminModule } from './modules/admin/admin.module';
import { SignalementModule } from './modules/signalement/signalement.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../../../'),
      renderPath: 'public/',
    }),
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
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        connection: {
          url: config.get('REDIS_URL'),
        },
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: true,
        },
      }),
      inject: [ConfigService],
    }),
    MailerModule.forRootAsync(MailerParams),
    NumeroModule,
    BaseLocaleModule,
    VoieModule,
    ToponymeModule,
    StatsModule,
    AdminModule,
    SignalementModule,
  ],
  controllers: [],
  providers: [],
})
export class ApiModule {}
