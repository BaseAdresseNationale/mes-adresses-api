import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { NumeroService } from './numero.service';
import { NumeroController } from './numero.controller';
import { NumeroMiddleware } from '@/lib/middlewares/numero.middleware';
import { ToponymeMiddleware } from '@/lib/middlewares/toponyme.middleware';
import { VoieMiddleware } from '@/lib/middlewares/voie.middleware';
import { BaseLocaleMiddleware } from '@/lib/middlewares/base_locale.middleware';
import { TilesService } from '@/lib/tiles/tiles.services';
import { VoieService } from '../voie/voie.service';
import { ToponymeService } from '../toponyme/toponyme.service';
import { DbModule } from '@/lib/db/db.module';

@Module({
  imports: [DbModule],
  providers: [
    NumeroService,
    VoieService,
    ToponymeService,
    NumeroMiddleware,
    ToponymeMiddleware,
    VoieMiddleware,
    BaseLocaleMiddleware,
    TilesService,
  ],
  controllers: [NumeroController],
})
export class NumeroModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(NumeroMiddleware)
      .forRoutes(
        { path: 'numeros/:numeroId', method: RequestMethod.GET },
        { path: 'numeros/:numeroId', method: RequestMethod.PUT },
        { path: 'numeros/:numeroId', method: RequestMethod.DELETE },
        { path: 'numeros/:numeroId/soft-delete', method: RequestMethod.PUT },
      )
      .apply(VoieMiddleware)
      .forRoutes(
        { path: 'voies/:voieId/numeros', method: RequestMethod.GET },
        { path: 'voies/:voieId/numeros', method: RequestMethod.POST },
      )
      .apply(ToponymeMiddleware)
      .forRoutes({
        path: 'toponymes/:toponymeId/numeros',
        method: RequestMethod.GET,
      })
      .apply(BaseLocaleMiddleware)
      .forRoutes(
        {
          path: 'bases_locales/:baseLocaleId/numeros/batch',
          method: RequestMethod.PUT,
        },
        {
          path: 'bases_locales/:baseLocaleId/numeros/batch/soft-delete',
          method: RequestMethod.PUT,
        },
        {
          path: 'bases_locales/:baseLocaleId/numeros/batch',
          method: RequestMethod.DELETE,
        },
      );
  }
}
