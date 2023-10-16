import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VoieMiddleware } from '@/lib/middlewares/voie.middleware';
import { VoieController } from './voie.controller';
import { NumeroService } from '@/modules/numeros/numero.service';
import { TilesService } from '@/lib/services/tiles.service';
import { DbModelFactory } from '@/lib/model_factory/db.model.factory';

@Module({
  imports: [MongooseModule.forFeatureAsync(DbModelFactory)],
  providers: [VoieMiddleware, NumeroService, TilesService],
  controllers: [VoieController],
})
export class VoieModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(VoieMiddleware)
      .forRoutes({ path: 'voies/:voieId/numeros', method: RequestMethod.ALL });
  }
}
