import { Module, forwardRef } from '@nestjs/common';

import { VoieModule } from '../voie/voie.module';
import { BaseLocaleModule } from '../base_locale/base_locale.module';
import { PopulateModule } from '../base_locale/sub_modules/populate/populate.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ToponymeModule } from '../toponyme/toponyme.module';
import { NumeroModule } from '../numeros/numero.module';

@Module({
  imports: [
    forwardRef(() => BaseLocaleModule),
    forwardRef(() => PopulateModule),
    forwardRef(() => VoieModule),
    forwardRef(() => ToponymeModule),
    forwardRef(() => NumeroModule),
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
