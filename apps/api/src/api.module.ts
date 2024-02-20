import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { NumeroModule } from './modules/numeros/numero.module';
import { BaseLocaleModule } from './modules/base_locale/base_locale.module';
import { VoieModule } from './modules/voie/voie.module';
import { ToponymeModule } from './modules/toponyme/toponyme.module';
import { StatsModule } from './modules/stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        uri: config.get('MONGODB_URL'),
        dbName: config.get('MONGODB_DBNAME'),
        ...(config.get('MONGODB_CERTIFICATE') && {
          tls: true,
          tlsCAFile: config.get('MONGODB_CERTIFICATE'),
          authMechanism: 'PLAIN',
        }),
      }),
      inject: [ConfigService],
    }),
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
