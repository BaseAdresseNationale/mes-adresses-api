import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Numeros, NumerosSchema } from './numeros.schema';
import { BasesLocales, BasesLocalesSchema } from './../bases_locales/bases_locales.schema';
import { NumerosService } from './numeros.service';
import { NumerosController } from './numeros.controller';
import { NumeroMiddleware } from './../middlewares/numero.middleware';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Numeros.name, schema: NumerosSchema }]),
    MongooseModule.forFeature([{ name: BasesLocales.name, schema: BasesLocalesSchema }])
  ],
  providers: [NumerosService, NumeroMiddleware],
  controllers: [NumerosController],
})
export class NumerosModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(NumeroMiddleware)
      .forRoutes({ path: 'numeros/:numeroId', method: RequestMethod.ALL });
  }
}
