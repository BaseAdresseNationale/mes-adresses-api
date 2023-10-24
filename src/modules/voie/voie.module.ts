import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { VoieMiddleware } from '@/lib/middlewares/voie.middleware';
import { VoieController } from './voie.controller';
import { DbModule } from '@/lib/modules/db.module';

@Module({
  imports: [DbModule],
  providers: [VoieMiddleware],
  controllers: [VoieController],
})
export class VoieModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(VoieMiddleware)
      .forRoutes({ path: 'voies/:voieId/numeros', method: RequestMethod.ALL });
  }
}
