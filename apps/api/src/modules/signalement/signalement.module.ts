import { Module, MiddlewareConsumer, forwardRef } from '@nestjs/common';

import { BaseLocaleMiddleware } from '@/modules/base_locale/base_locale.middleware';
import { ConfigModule } from '@nestjs/config';
import { BaseLocaleModule } from '../base_locale/base_locale.module';
import { SignalementService } from './signalement.service';
import { SignalementController } from './signalement.controller';
import { OpenAPISignalementService } from './openAPI-signalement.service';

@Module({
  imports: [ConfigModule, forwardRef(() => BaseLocaleModule)],
  providers: [SignalementService, OpenAPISignalementService],
  controllers: [SignalementController],
  exports: [SignalementService],
})
export class SignalementModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BaseLocaleMiddleware).forRoutes(SignalementController);
  }
}
