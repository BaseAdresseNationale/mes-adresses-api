export type Task = {
  title: string;
  run(): void;
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
      console.debug(`Task start ${task.title}`);
      try {
        await task.run();
      } catch (e) {
        console.debug(`Task error ${task.title}`, e);
      }
      console.debug(`Task end ${task.title}`);
    }

    this.isTaskRunning = false;
  }
}
