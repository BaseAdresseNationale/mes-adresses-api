import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Numero, NumeroSchema } from './schema/numero.schema';
import { BasesLocales, BasesLocalesSchema } from './../bases_locales/bases_locales.schema';
import { NumeroService } from './numero.service';
import { NumeroController } from './numero.controller';
import { NumeroMiddleware } from './../middlewares/numero.middleware';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Numero.name, schema: NumeroSchema }]),
    MongooseModule.forFeature([{ name: BasesLocales.name, schema: BasesLocalesSchema }])
  ],
  providers: [NumeroService, NumeroMiddleware],
  controllers: [NumeroController],
})
export class NumeroModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(NumeroMiddleware)
      .forRoutes({ path: 'numeros/:numeroId', method: RequestMethod.ALL });
  }
}
