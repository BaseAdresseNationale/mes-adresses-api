import { CacheService } from '@/shared/modules/cache/cache.service';
import { KEY_LOCK_CRON } from '@/shared/modules/cache/cache.const';
import { Logger } from '@/shared/utils/logger.utils';

export type Task = {
  title: string;
  run(): Promise<void>;
};

export class TaskQueue {
  private queue: Task[] = [];
  private isTaskRunning: boolean = false;

  constructor(private cacheService: CacheService) {
    this.cacheService.del(KEY_LOCK_CRON);
  }

  public pushTask(task: Task) {
    this.queue.push(task);
    if (!this.isTaskRunning) {
      this.runTaskQueue();
    }
  }

  private async runTaskQueue() {
    this.isTaskRunning = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      await this.cacheService.wait(KEY_LOCK_CRON);
      await this.cacheService.set(KEY_LOCK_CRON, '');
      Logger.info(
        `[${TaskQueue.name}] TASK START ${task.title}`,
        TaskQueue.name,
      );
      try {
        await task.run();
      } catch (error) {
        Logger.error(
          `[${TaskQueue.name}] TASK ERROR ${task.title}`,
          error,
          TaskQueue.name,
        );
      }
      await this.cacheService.del(KEY_LOCK_CRON);
      Logger.info(`[${TaskQueue.name}] TASK END ${task.title}`, TaskQueue.name);
    }

    this.isTaskRunning = false;
  }
}
