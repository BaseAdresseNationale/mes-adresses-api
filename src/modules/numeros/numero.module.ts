import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { NumeroService } from './numero.service';
import { NumeroController } from './numero.controller';
import { NumeroMiddleware } from '@/lib/middlewares/numero.middleware';
import { ToponymeMiddleware } from '@/lib/middlewares/toponyme.middleware';
import { DbModule } from '@/lib/modules/db.module';
import { TilesService } from '@/lib/services/tiles.services';
import { DbService } from '@/lib/services/db.service';
import { VoieService } from '../voie/voie.service';
import { ToponymeService } from '../toponyme/toponyme.service';

@Module({
  imports: [DbModule],
  providers: [
    NumeroService,
    NumeroMiddleware,
    TilesService,
    DbService,
    VoieService,
    ToponymeService,
  ],
  controllers: [NumeroController],
})
export class NumeroModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(NumeroMiddleware)
      .forRoutes(
        { path: 'numeros/:voieId', method: RequestMethod.GET },
        { path: 'numeros/:voieId', method: RequestMethod.PUT },
        { path: 'numeros/:voieId', method: RequestMethod.DELETE },
        { path: 'numeros/:voieId/soft-delete', method: RequestMethod.PUT },
      )
      .apply(ToponymeMiddleware)
      .forRoutes({
        path: 'toponymes/:toponymeId/numeros',
        method: RequestMethod.GET,
      });
  }
}
