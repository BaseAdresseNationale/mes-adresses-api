import {
  Module,
  MiddlewareConsumer,
  forwardRef,
  RequestMethod,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  BaseLocale,
  BaseLocaleSchema,
} from '@/shared/schemas/base_locale/base_locale.schema';

import { BaseLocaleController } from '@/modules/base_locale/base_locale.controller';
import { BaseLocaleMiddleware } from '@/modules/base_locale/base_locale.middleware';
import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { MailerService } from '@/modules/base_locale/sub_modules/mailer/mailer.service';
import { HabilitationModule } from '@/modules/base_locale/sub_modules/habilitation/habilitation.module';
import { TilesModule } from '@/modules/base_locale/sub_modules/tiles/tiles.module';
import { NumeroModule } from '@/modules/numeros/numero.module';
import { VoieModule } from '@/modules/voie/voie.module';
import { ToponymeModule } from '@/modules/toponyme/toponyme.module';
import { CommuneModule } from './sub_modules/commune/commune.module';
import { PopulateModule } from './sub_modules/populate/populate.module';
import { SearchQueryPipe } from './pipe/search_query.pipe';

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
    forwardRef(() => CommuneModule),
    forwardRef(() => PopulateModule),
  ],
  providers: [
    BaseLocaleMiddleware,
    BaseLocaleService,
    MailerService,
    SearchQueryPipe,
  ],
  controllers: [BaseLocaleController],
  exports: [BaseLocaleService],
})
export class BaseLocaleModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(BaseLocaleMiddleware)
      .exclude({ path: 'bases-locales/search', method: RequestMethod.GET })
      .forRoutes(BaseLocaleController);
  }
}
