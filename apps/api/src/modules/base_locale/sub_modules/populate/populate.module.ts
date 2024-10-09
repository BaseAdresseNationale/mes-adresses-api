import { Logger, Module, forwardRef } from '@nestjs/common';
import { PopulateService } from './populate.service';
import { BaseLocaleModule } from '../../base_locale.module';
import { ApiDepotModule } from '@/shared/modules/api_depot/api_depot.module';
import { BanPlateformModule } from '@/shared/modules/ban_plateform/ban_plateform.module';

@Module({
  imports: [
    forwardRef(() => BaseLocaleModule),
    forwardRef(() => ApiDepotModule),
    forwardRef(() => BanPlateformModule),
  ],
  providers: [PopulateService, Logger],
  exports: [PopulateService],
})
export class PopulateModule {}
