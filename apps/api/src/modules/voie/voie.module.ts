import { Module, MiddlewareConsumer, forwardRef } from '@nestjs/common';
import { VoieMiddleware } from '@/modules/voie/voie.middleware';
import { VoieController } from './voie.controller';
import { VoieService } from './voie.service';
import { NumeroModule } from '../numeros/numero.module';
import { BaseLocaleModule } from '../base_locale/base_locale.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Voie, VoieSchema } from './schema/voie.schema';
import { TilesModule } from '../base_locale/sub_modules/tiles/tiles.module';

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
