import { Logger } from '@/shared/utils/logger.utils';

export type Task = {
  title: string;
  run(): Promise<void>;
};

export class TaskQueue {
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
      Logger.info(`[${TaskQueue.name}] TASK END ${task.title}`, TaskQueue.name);
    }

    this.isTaskRunning = false;
  }
}
