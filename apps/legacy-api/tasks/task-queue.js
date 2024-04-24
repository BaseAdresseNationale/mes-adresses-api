class TaskQueue {
  constructor() {
    this.queue = []
    this.isTaskRunning = false
  }

  pushTask(task) {
    this.queue.push(task)
    if (!this.isTaskRunning) {
      this.runTaskQueue()
    }
  }

  async runTaskQueue() {
    this.isTaskRunning = true

    while (this.queue.length > 0) {
      const task = this.queue.shift()
      // eslint-disable-next-line no-await-in-loop
      await task()
    }

    this.isTaskRunning = false
  }
}

module.exports = {TaskQueue}
