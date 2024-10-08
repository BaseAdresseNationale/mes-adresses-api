import { NestFactory } from '@nestjs/core';
import { CronModule } from './cron.module';

import { WinstonLogger } from '@/shared/modules/logger/logger.service';
import { Logger } from '@/shared/utils/logger.utils';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(CronModule);
  app.useLogger(new WinstonLogger(Logger));
}
bootstrap();
