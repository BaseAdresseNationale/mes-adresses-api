import { Module, MiddlewareConsumer, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Voie, VoieSchema } from '@/shared/schemas/voie/voie.schema';

import { VoieMiddleware } from '@/modules/voie/voie.middleware';
import { VoieController } from '@/modules/voie/voie.controller';
import { VoieService } from '@/modules/voie/voie.service';
import { NumeroModule } from '@/modules/numeros/numero.module';
import { BaseLocaleModule } from '@/modules/base_locale/base_locale.module';
import { TilesModule } from '@/modules/base_locale/sub_modules/tiles/tiles.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Voie.name, schema: VoieSchema }]),
    forwardRef(() => NumeroModule),
    forwardRef(() => BaseLocaleModule),
    forwardRef(() => TilesModule),
  ],
  providers: [VoieService, VoieMiddleware],
  controllers: [VoieController],
  exports: [VoieService],
})
export class VoieModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(VoieMiddleware).forRoutes(VoieController);
  }
}
