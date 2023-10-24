import { Module, MiddlewareConsumer } from '@nestjs/common';
import { BaseLocaleController } from './base_locale.controller';
import { BaseLocaleMiddleware } from '@/lib/middlewares/base_locale.middleware';
import { DbModule } from '@/lib/modules/db.module';
import { BaseLocaleService } from './base_locale.service';

@Module({
  imports: [DbModule],
  providers: [BaseLocaleMiddleware, BaseLocaleService],
  controllers: [BaseLocaleController],
})
export class BaseLocaleModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BaseLocaleMiddleware).forRoutes(BaseLocaleController);
  }
}
