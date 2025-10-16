import { Module, MiddlewareConsumer, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Numero } from '@/shared/entities/numero.entity';
import { Position } from '@/shared/entities/position.entity';

import { NumeroService } from '@/modules/numeros/numero.service';
import { NumeroController } from '@/modules/numeros/numero.controller';
import { NumeroMiddleware } from '@/modules/numeros/numero.middleware';
import { VoieModule } from '@/modules/voie/voie.module';
import { ToponymeModule } from '@/modules/toponyme/toponyme.module';
import { BaseLocaleModule } from '@/modules/base_locale/base_locale.module';
import { TilesModule } from '@/modules/base_locale/sub_modules/tiles/tiles.module';
import { S3Module } from '@/shared/modules/s3/s3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Numero, Position]),
    forwardRef(() => VoieModule),
    forwardRef(() => ToponymeModule),
    forwardRef(() => BaseLocaleModule),
    forwardRef(() => TilesModule),
    forwardRef(() => S3Module),
  ],
  providers: [NumeroService, NumeroMiddleware],
  controllers: [NumeroController],
  exports: [NumeroService],
})
export class NumeroModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(NumeroMiddleware).forRoutes(NumeroController);
  }
}
