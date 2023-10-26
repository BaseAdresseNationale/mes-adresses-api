import { Module, MiddlewareConsumer } from '@nestjs/common';
import { BaseLocaleController } from './base_locale.controller';
import { BaseLocaleMiddleware } from '@/lib/middlewares/base_locale.middleware';
import { DbModule } from '@/lib/db/db.module';
import { BaseLocaleService } from './base_locale.service';
import { MailerService } from '@/lib/mailer/mailer.service';

@Module({
  imports: [DbModule],
  providers: [BaseLocaleMiddleware, BaseLocaleService, MailerService],
  controllers: [BaseLocaleController],
  exports: [BaseLocaleService],
})
export class BaseLocaleModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BaseLocaleMiddleware).forRoutes(BaseLocaleController);
  }
}
