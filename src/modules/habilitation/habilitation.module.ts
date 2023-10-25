import { Module, MiddlewareConsumer } from '@nestjs/common';
import { HabilitationController } from './habilitation.controller';
import { BaseLocaleMiddleware } from '@/lib/middlewares/base_locale.middleware';
import { HabilitationService } from './habilitation.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BaseLocaleService } from '../base_locale/base_locale.service';
import { MailerService } from '@/lib/mailer/mailer.service';
import { BaseLocaleModule } from '../base_locale/base_locale.module';
import { DbModule } from '@/lib/db/db.module';

@Module({
  imports: [
    DbModule,
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
    BaseLocaleModule,
  ],
  providers: [
    HabilitationService,
    BaseLocaleMiddleware,
    BaseLocaleService,
    MailerService,
  ],
  controllers: [HabilitationController],
})
export class HabilitationModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BaseLocaleMiddleware).forRoutes(HabilitationController);
  }
}
