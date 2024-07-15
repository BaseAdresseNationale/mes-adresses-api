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

import { NumeroModule } from './modules/numeros/numero.module';
import { BaseLocaleModule } from './modules/base_locale/base_locale.module';
import { VoieModule } from './modules/voie/voie.module';
import { ToponymeModule } from './modules/toponyme/toponyme.module';
import { StatsModule } from './modules/stats/stats.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../../../'),
      renderPath: 'public/',
    }),
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('POSTGRES_HOST'),
        port: config.get('POSTGRES_PORT'),
        username: config.get('POSTGRES_USERNAME'),
        password: config.get('POSTGRES_PASSWORD'),
        database: config.get('POSTGRES_DATABASE'),
        entities: [BaseLocale, Voie, Numero, Toponyme, Position],
      }),
      inject: [ConfigService],
    }),
    NumeroModule,
    BaseLocaleModule,
    VoieModule,
    ToponymeModule,
    StatsModule,
    AdminModule,
  ],
  controllers: [],
  providers: [],
})
export class ApiModule {}
