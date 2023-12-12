import { Logger } from '@nestjs/common';
import { CronService } from './cron.service';

export type Task = {
  title: string;
  run(): void;
};

export class TaskQueue {
  private queue: Task[] = [];
  private isTaskRunning: boolean = false;
  private readonly logger = new Logger(CronService.name);

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
      this.logger.debug(`Task start: ${task.title}`);
      await task.run();
      this.logger.debug(`Task end: ${task.title}`);
    }

    this.isTaskRunning = false;
  }
}
