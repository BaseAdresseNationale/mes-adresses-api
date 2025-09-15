import { Logger } from '@/shared/utils/logger.utils';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TaskTitle } from '@/shared/types/task.type';
import { DetectOutdatedTask } from './tasks/detect_outdated.task';
import { DetectConflictTask } from './tasks/detect_conflict.task';
import { SyncOutdatedTask } from './tasks/sync_outdated.task';
import { RemoveSoftDeleteBalTask } from './tasks/remove_soft_delete_bal.task';
import { RemoveDemoBalTask } from './tasks/remove_demo_bal.task';
import { UploadTracesTask } from './tasks/upload_traces.task';
import { ForcePublishTask } from './tasks/force_publish.task';

@Processor('task')
export class TaskProcessor extends WorkerHost {
  constructor(
    private readonly detectOutdatedTask: DetectOutdatedTask,
    private readonly detectConflictTask: DetectConflictTask,
    private readonly syncOutdatedTask: SyncOutdatedTask,
    private readonly removeSoftDeleteBalTask: RemoveSoftDeleteBalTask,
    private readonly removeDemoBalTask: RemoveDemoBalTask,
    private readonly uploadTracesTask: UploadTracesTask,
    private readonly forcePublishTask: ForcePublishTask,
  ) {
    super();
  }
  wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async process(job: Job) {
    Logger.info(
      `[${TaskProcessor.name}] Start task ${job.name}`,
      TaskProcessor.name,
    );
    try {
      if (job.name === TaskTitle.DETECT_OUTDATED) {
        await this.detectOutdatedTask.run();
      } else if (job.name === TaskTitle.DETECT_CONFLICT) {
        await this.detectConflictTask.run();
      } else if (job.name === TaskTitle.SYNC_OUTDATED) {
        await this.syncOutdatedTask.run();
      } else if (job.name === TaskTitle.FORCE_PUBLISH) {
        await this.wait(4000);
        await this.forcePublishTask.run(job.data.balId);
      } else if (job.name === TaskTitle.REMOVE_SOFT_DELETE_BAL) {
        await this.removeSoftDeleteBalTask.run();
      } else if (job.name === TaskTitle.REMOVE_DEMO_BAL) {
        await this.removeDemoBalTask.run();
      } else if (job.name === TaskTitle.UPLOAD_TRACES) {
        await this.uploadTracesTask.run();
      }
    } catch (error) {
      Logger.error(
        `[${TaskProcessor.name}] Error task ${job.name}`,
        error,
        TaskProcessor.name,
      );
      return { success: false, error: error.message };
    }
    Logger.info(
      `[${TaskProcessor.name}] End task ${job.name}`,
      TaskProcessor.name,
    );
    return { success: true };
  }
}
