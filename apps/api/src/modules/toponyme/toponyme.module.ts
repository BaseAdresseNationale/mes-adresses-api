import { MiddlewareConsumer, Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Toponyme,
  ToponymeSchema,
} from '@/shared/schemas/toponyme/toponyme.schema';

import { ToponymeController } from '@/modules/toponyme/toponyme.controller';
import { ToponymeService } from '@/modules/toponyme/toponyme.service';
import { NumeroModule } from '@/modules/numeros/numero.module';
import { ToponymeMiddleware } from '@/modules/toponyme/toponyme.middleware';
import { BaseLocaleModule } from '@/modules/base_locale/base_locale.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Toponyme.name, schema: ToponymeSchema },
    ]),
    forwardRef(() => BaseLocaleModule),
    forwardRef(() => NumeroModule),
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
