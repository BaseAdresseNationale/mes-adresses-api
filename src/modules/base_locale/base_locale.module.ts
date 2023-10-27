import { Module, MiddlewareConsumer, forwardRef } from '@nestjs/common';
import { BaseLocaleController } from './base_locale.controller';
import { BaseLocaleMiddleware } from '@/modules/base_locale/base_locale.middleware';
import { BaseLocaleService } from './base_locale.service';
import { MailerService } from '@/lib/mailer/mailer.service';
import { HabilitationModule } from './sub_modules/habilitation/habilitation.module';
import { TilesModule } from './sub_modules/tiles/tiles.module';
import { NumeroModule } from '../numeros/numero.module';
import { MongooseModule } from '@nestjs/mongoose';
import { BaseLocale, BaseLocaleSchema } from './schema/base_locale.schema';
import { VoieModule } from '../voie/voie.module';
import { ToponymeModule } from '../toponyme/toponyme.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BaseLocale.name, schema: BaseLocaleSchema },
    ]),
    forwardRef(() => HabilitationModule),
    forwardRef(() => TilesModule),
    forwardRef(() => NumeroModule),
    forwardRef(() => VoieModule),
    forwardRef(() => ToponymeModule),
  ],
  providers: [BaseLocaleMiddleware, BaseLocaleService, MailerService],
  controllers: [BaseLocaleController],
  exports: [BaseLocaleService],
})
export class BaseLocaleModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BaseLocaleMiddleware).forRoutes(BaseLocaleController);
  }
}
