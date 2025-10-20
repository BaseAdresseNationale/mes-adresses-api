import {
  Module,
  MiddlewareConsumer,
  forwardRef,
  RequestMethod,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BaseLocaleController } from '@/modules/base_locale/base_locale.controller';
import { BaseLocaleMiddleware } from '@/modules/base_locale/base_locale.middleware';
import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { PublicationModule } from '@/shared/modules/publication/publication.module';
import { SearchQueryPipe } from './pipe/search_query.pipe';
import { BanPlateformModule } from '@/shared/modules/ban_plateform/ban_plateform.module';
import { BaseLocale } from '@/shared/entities/base_locale.entity';

import { HabilitationModule } from '@/modules/base_locale/sub_modules/habilitation/habilitation.module';
import { ExportCsvModule } from '@/modules/base_locale/sub_modules/export_csv/export_csv.module';
import { TilesModule } from '@/modules/base_locale/sub_modules/tiles/tiles.module';
import { NumeroModule } from '@/modules/numeros/numero.module';
import { VoieModule } from '@/modules/voie/voie.module';
import { ToponymeModule } from '@/modules/toponyme/toponyme.module';
import { CommuneModule } from './sub_modules/commune/commune.module';
import { PopulateModule } from './sub_modules/populate/populate.module';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@/shared/modules/cache/cache.module';
import { AlertModule } from '../alert/alert.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([BaseLocale]),
    PublicationModule,
    CacheModule,
    forwardRef(() => BanPlateformModule),
    forwardRef(() => HabilitationModule),
    forwardRef(() => ExportCsvModule),
    forwardRef(() => TilesModule),
    forwardRef(() => NumeroModule),
    forwardRef(() => VoieModule),
    forwardRef(() => ToponymeModule),
    forwardRef(() => CommuneModule),
    forwardRef(() => PopulateModule),
    forwardRef(() => AlertModule),
  ],
  providers: [BaseLocaleMiddleware, BaseLocaleService, SearchQueryPipe],
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
