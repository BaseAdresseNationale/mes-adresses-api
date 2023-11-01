import { Module, forwardRef } from '@nestjs/common';

import { StatsController } from '@/modules/stats/stats.controller';
import { StatsService } from '@/modules/stats/stats.service';
import { BaseLocaleModule } from '@/modules/base_locale/base_locale.module';

@Module({
  imports: [forwardRef(() => BaseLocaleModule)],
  providers: [StatsService],
  controllers: [StatsController],
})
export class StatsModule {}
