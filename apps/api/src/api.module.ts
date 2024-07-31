import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { Start1721638331361 } from '../../../migrations/1721638331361-start';
import { Emails1721720531648 } from '../../../migrations/1721720531648-emails';
import { Emails1721737016715 } from '../../../migrations/1721737016715-emails';
import { Index1722325570094 } from '../../../migrations/1722325570094-index';
import { Rank1722330899185 } from '../../../migrations/1722330899185-rank';
import { Index21722416272415 } from '../../../migrations/1722416272415-index2';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Numero } from '@/shared/entities/numero.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { Position } from '@/shared/entities/position.entity';

import { NumeroModule } from './modules/numeros/numero.module';
import { BaseLocaleModule } from './modules/base_locale/base_locale.module';
import { VoieModule } from './modules/voie/voie.module';
import { ToponymeModule } from './modules/toponyme/toponyme.module';
import { StatsModule } from './modules/stats/stats.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailerParams } from '@/shared/params/mailer.params';

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
        migrationsRun: true,
        migrations: [
          Start1721638331361,
          Emails1721720531648,
          Emails1721737016715,
          Index1722325570094,
          Rank1722330899185,
          Index21722416272415,
        ],
        entities: [BaseLocale, Voie, Numero, Toponyme, Position],
      }),
      inject: [ConfigService],
    }),
    MailerModule.forRootAsync(MailerParams),
    NumeroModule,
    BaseLocaleModule,
    VoieModule,
    ToponymeModule,
    StatsModule,
  ],
  controllers: [],
  providers: [],
})
export class ApiModule {}
