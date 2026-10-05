import {
  Logger,
  MiddlewareConsumer,
  Module,
  RequestMethod,
  forwardRef,
} from '@nestjs/common';

import { VoieModule } from '../voie/voie.module';
import { BaseLocaleModule } from '../base_locale/base_locale.module';
import { PopulateModule } from '../base_locale/sub_modules/populate/populate.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ToponymeModule } from '../toponyme/toponyme.module';
import { NumeroModule } from '../numeros/numero.module';
import { BaseLocaleMiddleware } from '../base_locale/base_locale.middleware';
import { CacheModule } from '@/shared/modules/cache/cache.module';

@Module({
  imports: [
    forwardRef(() => BaseLocaleModule),
    forwardRef(() => PopulateModule),
    forwardRef(() => VoieModule),
    forwardRef(() => ToponymeModule),
    forwardRef(() => NumeroModule),
    CacheModule,
  ],
  providers: [AdminService, Logger],
  controllers: [AdminController],
})
export class AdminModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BaseLocaleMiddleware).forRoutes({
      path: 'admin/bases-locales/:baseLocaleId/sync-ids-ban-publish',
      method: RequestMethod.POST,
    });
  }
}
