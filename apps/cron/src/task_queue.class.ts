export type Task = {
  title: string;
  service: { run(): void };
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
      console.log('Task start: ', task.title);
      await task.service.run();
      console.log('Task end: ', task.title);
    }

    this.isTaskRunning = false;
  }
}
