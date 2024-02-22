import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { writeFileSync } from 'node:fs';

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
