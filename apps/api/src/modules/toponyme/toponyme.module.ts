import { MiddlewareConsumer, Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Toponyme } from '@/shared/entities/toponyme.entity';
import { Position } from '@/shared/entities/position.entity';

import { ToponymeController } from '@/modules/toponyme/toponyme.controller';
import { ToponymeService } from '@/modules/toponyme/toponyme.service';
import { NumeroModule } from '@/modules/numeros/numero.module';
import { ToponymeMiddleware } from '@/modules/toponyme/toponyme.middleware';
import { BaseLocaleModule } from '@/modules/base_locale/base_locale.module';
import { EventModule } from '@/modules/event/event.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Toponyme, Position]),
    forwardRef(() => BaseLocaleModule),
    forwardRef(() => NumeroModule),
    EventModule,
  ],
  providers: [ToponymeService, ToponymeMiddleware],
  controllers: [ToponymeController],
  exports: [ToponymeService],
})
export class ToponymeModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ToponymeMiddleware).forRoutes(ToponymeController);
  }
}
