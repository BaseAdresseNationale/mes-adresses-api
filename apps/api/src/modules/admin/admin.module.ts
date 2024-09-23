import { Module, forwardRef } from '@nestjs/common';

import { VoieModule } from '../voie/voie.module';
import { BaseLocaleModule } from '../base_locale/base_locale.module';
import { PopulateModule } from '../base_locale/sub_modules/populate/populate.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    forwardRef(() => BaseLocaleModule),
    forwardRef(() => PopulateModule),
    forwardRef(() => VoieModule),
  ],
  providers: [],
  controllers: [AdminController],
})
export class AdminModule {}
