import { NestFactory } from '@nestjs/core';
import { CronModule } from './cron.module';
import { DetectOutdatedTask } from './tasks/detect_outdated.task';
import { Task } from './task.type';
import { Type } from '@nestjs/common';
import { Cache } from '@nestjs/cache-manager';
import { SyncOutdatedTask } from './tasks/sync_outdated.task';
import { RemoveDemoBalTask } from './tasks/remove_demo_bal.task';
import { RemoveSoftDeleteBalTask } from './tasks/remove_soft_delete_bal.task';
import { DetectConflictTask } from './tasks/detect_conflict.task';

const tasks: Record<string, Type<Task>> = {
  detect_outdated: DetectOutdatedTask,
  sync_outdated: SyncOutdatedTask,
  remove_demo_bal: RemoveDemoBalTask,
  remove_soft_delete_bal: RemoveSoftDeleteBalTask,
  detect_conflict: DetectConflictTask,
};

export const KEY_CRON_IS_RUNNING = 'cronIsRunning';

async function bootstrap() {
  // On créer le module NestJs
  const app = await NestFactory.createApplicationContext(CronModule);
  // On récupère les Cache
  const cache: Cache = app.get(Cache);
  try {
    // On vérifie que aucun cron ne run pour le moment
    const cronIsRunning = await cache.get(KEY_CRON_IS_RUNNING);
    if (!cronIsRunning) {
      // On lock le cron grace au cache
      await cache.set(KEY_CRON_IS_RUNNING, true);
      // On récupère argv qui correspond au type de cron qu'on veut lancer
      const argv = process.argv[2];
      if (tasks[argv]) {
        // On lance le cron
        const service = app.get(tasks[argv]);
        await service.run();
      }
      // On enlève le lock du cron sur le cache
    }
  } finally {
    await cache.set(KEY_CRON_IS_RUNNING, false);
  }
  // On ferme l'application
  await app.close();
  process.exit();
}

bootstrap();
