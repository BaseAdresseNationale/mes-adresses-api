import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Voie, VoieSchema } from './schema/voie.schema';
import { VoieMiddleware } from '@/lib/middlewares/voie.middleware';
import { VoieController } from './voie.controller';
import { Numero, NumeroSchema } from '@/modules/numeros//schema/numero.schema';
import {
  Toponyme,
  ToponymeSchema,
} from '@/modules/toponyme/schema/toponyme.schema';
import {
  BaseLocale,
  BaseLocaleSchema,
} from '@/modules/base_locale/schema/base_locale.schema';
import { NumeroService } from '@/modules/numeros/numero.service';
import { TilesService } from '@/lib/services/tiles.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Numero.name, schema: NumeroSchema },
      { name: BaseLocale.name, schema: BaseLocaleSchema },
      { name: Toponyme.name, schema: ToponymeSchema },
      { name: Voie.name, schema: VoieSchema },
    ]),
  ],
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
