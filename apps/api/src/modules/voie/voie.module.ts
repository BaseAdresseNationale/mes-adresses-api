import { Module, MiddlewareConsumer, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Voie } from '@/shared/entities/voie.entity';

import { VoieMiddleware } from '@/modules/voie/voie.middleware';
import { VoieController } from '@/modules/voie/voie.controller';
import { VoieService } from '@/modules/voie/voie.service';
import { NumeroModule } from '@/modules/numeros/numero.module';
import { ToponymeModule } from '@/modules/toponyme/toponyme.module';
import { BaseLocaleModule } from '@/modules/base_locale/base_locale.module';
import { TilesModule } from '@/modules/base_locale/sub_modules/tiles/tiles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Voie]),
    forwardRef(() => NumeroModule),
    forwardRef(() => BaseLocaleModule),
    forwardRef(() => TilesModule),
    forwardRef(() => ToponymeModule),
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
