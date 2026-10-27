import { Logger, Module, forwardRef } from '@nestjs/common';
import { PopulateService } from './populate.service';
import { BaseLocaleModule } from '../../base_locale.module';
import { BanPlateformModule } from '../ban_plateform/ban_plateform.module';
import { ApiDepotModule } from '../api_depot/api_depot.module';

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
