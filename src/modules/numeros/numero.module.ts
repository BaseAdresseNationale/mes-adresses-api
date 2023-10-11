import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Numero, NumeroSchema } from './schema/numero.schema';
import { Voie, VoieSchema } from '@/modules/voie/schema/voie.schema';
import {
  Toponyme,
  ToponymeSchema,
} from '@/modules/toponyme/schema/toponyme.schema';
import {
  BaseLocale,
  BaseLocaleSchema,
} from '@/modules/base_locale/schema/base_locale.schema';
import { NumeroService } from './numero.service';
import { NumeroController } from './numero.controller';
import { NumeroMiddleware } from '@/lib/middlewares/numero.middleware';
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
  providers: [NumeroService, NumeroMiddleware, TilesService],
  controllers: [NumeroController],
})
export class NumeroModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(NumeroMiddleware)
      .forRoutes({ path: 'numeros/:numeroId', method: RequestMethod.ALL });
  }
}
