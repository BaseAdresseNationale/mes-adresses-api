import { Logger, Module, forwardRef } from '@nestjs/common';
import { PopulateService } from './populate.service';
import { BaseLocaleModule } from '../../base_locale.module';
import { ApiDepotModule } from '@/shared/modules/api_depot/api_depot.module';
import { BanPlateformModule } from '@/shared/modules/ban_plateform/ban_plateform.module';
import { ValidateurApiModule } from '@/shared/modules/validateur_api/validateur_api.module';

@Module({
  imports: [
    forwardRef(() => BaseLocaleModule),
    forwardRef(() => ApiDepotModule),
    forwardRef(() => BanPlateformModule),
    forwardRef(() => ValidateurApiModule),
  ],
  providers: [PopulateService, Logger],
  exports: [PopulateService],
})
export class PopulateModule {}
