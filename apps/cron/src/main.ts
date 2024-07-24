import { NestFactory } from '@nestjs/core';
import { CronModule } from './cron.module';
import { DetectOutdatedTask } from './tasks/detect_outdated.task';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(CronModule);
  if (process.argv[2] === 'detect_outdated') {
    const detectOutdatedService = app.get(DetectOutdatedTask);
    await detectOutdatedService.run();
  }
  await app.close();
}
bootstrap();
