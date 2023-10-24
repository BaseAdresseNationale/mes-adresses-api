import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ToponymeMiddleware } from '@/lib/middlewares/toponyme.middleware';
import { ToponymeController } from './toponyme.controller';
import { DbModule } from '@/lib/modules/db.module';

@Module({
  imports: [DbModule],
  providers: [ToponymeMiddleware],
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
