import { Module, forwardRef } from '@nestjs/common';

import { AdminController } from '@/modules/admin/admin.controller';
import { AdminService } from '@/modules/admin/admin.service';
import { BaseLocaleModule } from '@/modules/base_locale/base_locale.module';
import { PopulateModule } from '@/modules/base_locale/sub_modules/populate/populate.module';
import { VoieModule } from '../voie/voie.module';

@Module({
  imports: [
    forwardRef(() => BaseLocaleModule),
    forwardRef(() => PopulateModule),
    forwardRef(() => VoieModule),
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
