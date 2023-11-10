import { Module, forwardRef } from '@nestjs/common';
import { PopulateService } from './populate.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BaseLocaleModule } from '../../base_locale.module';
import { ApiDepotModule } from '@/shared/modules/api_depot/api_depot.module';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    forwardRef(() => BaseLocaleModule),
    forwardRef(() => ApiDepotModule),
  ],
  providers: [PopulateService],
  exports: [PopulateService],
})
export class PopulateModule {}
