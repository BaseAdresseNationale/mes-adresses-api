import {
  Module,
  MiddlewareConsumer,
  forwardRef,
  RequestMethod,
  Logger,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BaseLocaleController } from '@/modules/base_locale/base_locale.controller';
import { BaseLocaleMiddleware } from '@/modules/base_locale/base_locale.middleware';
import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { SearchQueryPipe } from './pipe/search_query.pipe';
import { BaseLocale } from '@/shared/entities/base_locale.entity';

import { HabilitationModule } from '@/modules/base_locale/modules/habilitation/habilitation.module';
import { ExportCsvModule } from '@/modules/base_locale/modules/export_csv/export_csv.module';
import { TilesModule } from '@/modules/base_locale/modules/tiles/tiles.module';
import { NumeroModule } from '@/modules/numeros/numero.module';
import { VoieModule } from '@/modules/voie/voie.module';
import { ToponymeModule } from '@/modules/toponyme/toponyme.module';
import { CommuneModule } from './modules/commune/commune.module';
import { PopulateModule } from './modules/populate/populate.module';
import { ConfigModule } from '@nestjs/config';
import { EventModule } from '@/modules/event/event.module';
import { BanPlateformModule } from './modules/ban_plateform/ban_plateform.module';
import { CacheModule } from '../cache/cache.module';
import { PublicationModule } from './modules/publication/publication.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([BaseLocale]),
    forwardRef(() => PublicationModule),
    CacheModule,
    forwardRef(() => ExportCsvModule),
    forwardRef(() => BanPlateformModule),
    forwardRef(() => HabilitationModule),
    forwardRef(() => ExportCsvModule),
    forwardRef(() => TilesModule),
    forwardRef(() => NumeroModule),
    forwardRef(() => VoieModule),
    forwardRef(() => ToponymeModule),
    forwardRef(() => CommuneModule),
    forwardRef(() => PopulateModule),
    EventModule,
  ],
  providers: [BaseLocaleMiddleware, BaseLocaleService, SearchQueryPipe, Logger],
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
