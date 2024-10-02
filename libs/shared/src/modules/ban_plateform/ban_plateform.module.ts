import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import { BanPlateformService } from './ban_plateform.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get('BAN_API_URL'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [BanPlateformService, Logger],
  exports: [BanPlateformService],
})
export class BanPlateformModule {}
