import { Module, forwardRef } from '@nestjs/common';
import { PopulateService } from './populate.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BaseLocaleModule } from '../../base_locale.module';

@Module({
  imports: [ConfigModule, HttpModule, forwardRef(() => BaseLocaleModule)],
  providers: [PopulateService],
  exports: [PopulateService],
})
export class PopulateModule {}
