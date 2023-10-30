import { MiddlewareConsumer, Module, forwardRef } from '@nestjs/common';
import { ToponymeController } from './toponyme.controller';
import { ToponymeService } from './toponyme.service';
import { NumeroModule } from '../numeros/numero.module';
import { ToponymeMiddleware } from './toponyme.middleware';
import { BaseLocaleModule } from '../base_locale/base_locale.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Toponyme,
  ToponymeSchema,
} from '@/shared/schemas/toponyme/toponyme.schema';

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
