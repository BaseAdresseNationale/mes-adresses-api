import { Module, MiddlewareConsumer, forwardRef } from '@nestjs/common';
import { TilesController } from './tiles.controller';
import { BaseLocaleMiddleware } from '@/modules/base_locale/base_locale.middleware';
import { TilesService } from './tiles.service';
import { VoieModule } from '@/modules/voie/voie.module';
import { NumeroModule } from '@/modules/numeros/numero.module';
import { BaseLocaleModule } from '../../base_locale.module';
import * as compression from 'compression';

@Module({
  imports: [
    forwardRef(() => BaseLocaleModule),
    forwardRef(() => VoieModule),
    forwardRef(() => NumeroModule),
  ],
  providers: [TilesService, BaseLocaleMiddleware],
  controllers: [TilesController],
  exports: [TilesService],
})
export class TilesModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BaseLocaleMiddleware).forRoutes(TilesController);
    // consumer.apply(compression).forRoutes(TilesController);
  }
}
