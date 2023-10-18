import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NumeroService } from './numero.service';
import { NumeroController } from './numero.controller';
import { NumeroMiddleware } from '@/lib/middlewares/numero.middleware';
import { DbModelFactory } from '@/lib/model_factory/db.model.factory';

@Module({
  imports: [MongooseModule.forFeatureAsync(DbModelFactory)],
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
