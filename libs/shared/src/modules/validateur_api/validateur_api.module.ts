import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import { ValidateurApiService } from './validateur_api.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get('API_VALIDATEUR_URL'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ValidateurApiService, Logger],
  exports: [ValidateurApiService],
})
export class ValidateurApiModule {}
