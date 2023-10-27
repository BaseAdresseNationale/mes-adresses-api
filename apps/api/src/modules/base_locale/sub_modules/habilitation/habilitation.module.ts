import { Module, MiddlewareConsumer, forwardRef } from '@nestjs/common';
import { HabilitationController } from './habilitation.controller';
import { BaseLocaleMiddleware } from '@/modules/base_locale/base_locale.middleware';
import { HabilitationService } from './habilitation.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { MailerService } from '@/modules/base_locale/sub_modules/mailer/mailer.service';
import { BaseLocaleModule } from '../../base_locale.module';

@Module({
  imports: [
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
    forwardRef(() => BaseLocaleModule),
  ],
  providers: [HabilitationService, BaseLocaleMiddleware, MailerService],
  controllers: [HabilitationController],
  exports: [HabilitationService],
})
export class HabilitationModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BaseLocaleMiddleware).forRoutes(HabilitationController);
  }
}
