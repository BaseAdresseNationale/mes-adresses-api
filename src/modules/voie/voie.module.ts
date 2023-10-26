import {
  Module,
  MiddlewareConsumer,
  RequestMethod,
  forwardRef,
} from '@nestjs/common';
import { VoieMiddleware } from '@/lib/middlewares/voie.middleware';
import { BaseLocaleMiddleware } from '@/lib/middlewares/base_locale.middleware';
import { VoieController } from './voie.controller';
import { DbModule } from '@/lib/db/db.module';
import { VoieService } from './voie.service';
import { TilesService } from '@/lib/tiles/tiles.services';
import { NumeroModule } from '../numeros/numero.module';

@Module({
  imports: [DbModule, forwardRef(() => NumeroModule)],
  providers: [VoieService, TilesService],
  controllers: [VoieController],
  exports: [VoieService],
})
export class VoieModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(VoieMiddleware)
      .forRoutes(
        { path: 'voies/:voieId', method: RequestMethod.GET },
        { path: 'voies/:voieId', method: RequestMethod.PUT },
        { path: 'voies/:voieId', method: RequestMethod.DELETE },
        { path: 'voies/:voieId/soft-delete', method: RequestMethod.PUT },
        { path: 'voies/:voieId/restore', method: RequestMethod.PUT },
      )
      .apply(BaseLocaleMiddleware)
      .forRoutes(
        {
          path: '/bases_locales/:baseLocaleId/voies',
          method: RequestMethod.POST,
        },
        {
          path: '/bases_locales/:baseLocaleId/voies',
          method: RequestMethod.GET,
        },
      );
  }
}
