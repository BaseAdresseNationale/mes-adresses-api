import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DbModelFactory } from '@/lib/model_factory/db.model.factory';
import { ToponymeMiddleware } from '@/lib/middlewares/toponyme.middleware';
import { ToponymeController } from './toponyme.controller';
import { NumeroService } from '@/modules/numeros/numero.service';

@Module({
  imports: [MongooseModule.forFeatureAsync(DbModelFactory)],
  providers: [ToponymeMiddleware, NumeroService],
  controllers: [ToponymeController],
})
export class ToponymeModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ToponymeMiddleware).forRoutes({
      path: 'toponymes/:toponymeId/numeros',
      method: RequestMethod.ALL,
    });
  }
}
