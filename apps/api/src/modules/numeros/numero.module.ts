import { Module, MiddlewareConsumer, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Numero } from '@/shared/entities/numero.entity';

import { NumeroService } from '@/modules/numeros/numero.service';
import { NumeroController } from '@/modules/numeros/numero.controller';
import { NumeroMiddleware } from '@/modules/numeros/numero.middleware';
import { VoieModule } from '@/modules/voie/voie.module';
import { ToponymeModule } from '@/modules/toponyme/toponyme.module';
import { BaseLocaleModule } from '@/modules/base_locale/base_locale.module';
import { TilesModule } from '@/modules/base_locale/sub_modules/tiles/tiles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Numero]),
    forwardRef(() => VoieModule),
    forwardRef(() => ToponymeModule),
    forwardRef(() => BaseLocaleModule),
    forwardRef(() => TilesModule),
  ],
  providers: [NumeroService, NumeroMiddleware],
  controllers: [NumeroController],
  exports: [NumeroService],
})
export class NumeroModule {
  configure(consumer: MiddlewareConsumer) {
    consumer;
    consumer.apply(NumeroMiddleware).forRoutes(NumeroController);
  }
}
