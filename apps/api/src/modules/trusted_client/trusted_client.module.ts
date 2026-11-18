import { Logger, Module, forwardRef } from '@nestjs/common';

import { BaseLocaleModule } from '../base_locale/base_locale.module';
import { TrustedClientController } from './trusted_client.controller';

@Module({
  imports: [forwardRef(() => BaseLocaleModule)],
  providers: [Logger],
  controllers: [TrustedClientController],
})
export class TrustedClientModule {}
