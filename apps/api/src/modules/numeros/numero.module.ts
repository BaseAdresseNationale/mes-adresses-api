import { Module, MiddlewareConsumer, forwardRef } from '@nestjs/common';
import { NumeroService } from './numero.service';
import { NumeroController } from './numero.controller';
import { NumeroMiddleware } from '@/modules/numeros/numero.middleware';
import { VoieModule } from '../voie/voie.module';
import { ToponymeModule } from '../toponyme/toponyme.module';
import { BaseLocaleModule } from '../base_locale/base_locale.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Numero, NumeroSchema } from './schema/numero.schema';
import { TilesModule } from '../base_locale/sub_modules/tiles/tiles.module';

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
