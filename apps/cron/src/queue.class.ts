import { Logger } from '@/shared/utils/logger.utils';

export type Task = {
  title: string;
  run(): Promise<void>;
};

export class Queue {
  private queue: Task[] = [];
  private isTaskRunning: boolean = false;

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
      Logger.info(`[${Queue.name}] TASK START ${task.title}`, Queue.name);
      try {
        await task.run();
      } catch (error) {
        Logger.error(
          `[${Queue.name}] TASK ERROR ${task.title}`,
          error,
          Queue.name,
        );
      }
      Logger.info(`[${Queue.name}] TASK END ${task.title}`, Queue.name);
    }

    this.isTaskRunning = false;
  }
}
