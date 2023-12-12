import { Module, MiddlewareConsumer, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Numero, NumeroSchema } from '@/shared/schemas/numero/numero.schema';

import { NumeroService } from '@/modules/numeros/numero.service';
import { NumeroController } from '@/modules/numeros/numero.controller';
import { NumeroMiddleware } from '@/modules/numeros/numero.middleware';
import { VoieModule } from '@/modules/voie/voie.module';
import { ToponymeModule } from '@/modules/toponyme/toponyme.module';
import { BaseLocaleModule } from '@/modules/base_locale/base_locale.module';
import { TilesModule } from '@/modules/base_locale/sub_modules/tiles/tiles.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Numero.name, schema: NumeroSchema }]),
    forwardRef(() => VoieModule),
    forwardRef(() => ToponymeModule),
    forwardRef(() => BaseLocaleModule),
    forwardRef(() => TilesModule),
  ],
  providers: [NumeroService, NumeroMiddleware],
  controllers: [NumeroController],
  exports: [NumeroService],
})
export class NumeroModule {
  configure(consumer: MiddlewareConsumer) {
    consumer;
    consumer.apply(NumeroMiddleware).forRoutes(NumeroController);
  }
}
