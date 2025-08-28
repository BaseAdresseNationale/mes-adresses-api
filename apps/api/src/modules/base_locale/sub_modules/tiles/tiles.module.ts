import { Module, MiddlewareConsumer, forwardRef } from '@nestjs/common';
import { TilesController } from './tiles.controller';
import { BaseLocaleMiddleware } from '@/modules/base_locale/base_locale.middleware';
import { TilesService } from './tiles.service';
import { VoieModule } from '@/modules/voie/voie.module';
import { NumeroModule } from '@/modules/numeros/numero.module';
import { BaseLocaleModule } from '../../base_locale.module';
import { ToponymeModule } from '@/modules/toponyme/toponyme.module';

@Module({
  imports: [
    forwardRef(() => BaseLocaleModule),
    forwardRef(() => VoieModule),
    forwardRef(() => NumeroModule),
    forwardRef(() => ToponymeModule),
  ],
  providers: [TilesService, BaseLocaleMiddleware],
  controllers: [TilesController],
  exports: [TilesService],
})
export class TilesModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BaseLocaleMiddleware).forRoutes(TilesController);
  }
}
