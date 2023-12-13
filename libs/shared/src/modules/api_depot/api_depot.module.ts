import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import { ApiDepotService } from './api_depot.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get('API_DEPOT_URL'),
        headers: {
          Authorization: `Token ${configService.get(
            'API_DEPOT_CLIENT_SECRET',
          )}`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ApiDepotService],
  exports: [ApiDepotService],
})
export class ApiDepotModule {}
