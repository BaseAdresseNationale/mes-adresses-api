import { Module, MiddlewareConsumer } from '@nestjs/common';
import { TilesController } from './tiles.controller';
import { BaseLocaleMiddleware } from '@/lib/middlewares/base_locale.middleware';
import { TilesService } from './tiles.service';
import { DbModule } from '@/lib/db/db.module';

@Module({
  imports: [DbModule],
  providers: [TilesService, BaseLocaleMiddleware],
  controllers: [TilesController],
})
export class HabilitationModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BaseLocaleMiddleware).forRoutes(TilesController);
  }
}
