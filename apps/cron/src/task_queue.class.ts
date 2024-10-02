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
      Logger.info(`TASK START ${task.title}`);
      try {
        await task.run();
      } catch (error) {
        Logger.error(`TASK ERROR ${task.title}`, error);
      }
      Logger.info(`TASK END ${task.title}`);
    }

    this.isTaskRunning = false;
  }
}
