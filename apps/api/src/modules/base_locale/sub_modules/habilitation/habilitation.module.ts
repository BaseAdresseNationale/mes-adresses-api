import { Module, MiddlewareConsumer, forwardRef } from '@nestjs/common';

import { ApiDepotModule } from '@/shared/modules/api_depot/api_depot.module';

import { HabilitationController } from './habilitation.controller';
import { BaseLocaleMiddleware } from '@/modules/base_locale/base_locale.middleware';
import { HabilitationService } from './habilitation.service';
import { BaseLocaleModule } from '../../base_locale.module';

@Module({
  imports: [ApiDepotModule, forwardRef(() => BaseLocaleModule)],
  providers: [HabilitationService, BaseLocaleMiddleware],
  controllers: [HabilitationController],
  exports: [HabilitationService],
})
export class HabilitationModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BaseLocaleMiddleware).forRoutes(HabilitationController);
  }
}
