import { Module, MiddlewareConsumer, forwardRef, Logger } from '@nestjs/common';

import { HabilitationController } from './habilitation.controller';
import { BaseLocaleMiddleware } from '@/modules/base_locale/base_locale.middleware';
import { HabilitationService } from './habilitation.service';
import { BaseLocaleModule } from '../../base_locale.module';
import { ApiDepotModule } from '../api_depot/api_depot.module';

@Module({
  imports: [ApiDepotModule, forwardRef(() => BaseLocaleModule)],
  providers: [HabilitationService, BaseLocaleMiddleware, Logger],
  controllers: [HabilitationController],
  exports: [HabilitationService],
})
export class HabilitationModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BaseLocaleMiddleware).forRoutes(HabilitationController);
  }
}
