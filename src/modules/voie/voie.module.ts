import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { VoieMiddleware } from '@/lib/middlewares/voie.middleware';
import { VoieController } from './voie.controller';
import { DbModule } from '@/lib/modules/db.module';
import { VoieService } from './voie.service';

@Module({
  imports: [DbModule],
  providers: [VoieService, VoieMiddleware],
  controllers: [VoieController],
})
export class VoieModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(VoieMiddleware)
      .forRoutes({ path: 'voies/:voieId/numeros', method: RequestMethod.ALL });
  }
}
