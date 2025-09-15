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

@Processor('task')
export class TaskProcessor extends WorkerHost {
  constructor(
    private readonly detectOutdatedTask: DetectOutdatedTask,
    private readonly detectConflictTask: DetectConflictTask,
    private readonly syncOutdatedTask: SyncOutdatedTask,
    private readonly removeSoftDeleteBalTask: RemoveSoftDeleteBalTask,
    private readonly removeDemoBalTask: RemoveDemoBalTask,
    private readonly uploadTracesTask: UploadTracesTask,
  ) {
    super();
  }

  async process(job: Job) {
    Logger.log(`Start task ${job.name}`, TaskProcessor.name);
    if (job.name === TaskTitle.DETECT_OUTDATED) {
      await this.detectOutdatedTask.run();
    } else if (job.name === TaskTitle.DETECT_CONFLICT) {
      await this.detectConflictTask.run();
    } else if (job.name === TaskTitle.SYNC_OUTDATED) {
      await this.syncOutdatedTask.run();
    } else if (job.name === TaskTitle.REMOVE_SOFT_DELETE_BAL) {
      await this.removeSoftDeleteBalTask.run();
    } else if (job.name === TaskTitle.REMOVE_DEMO_BAL) {
      await this.removeDemoBalTask.run();
    } else if (job.name === TaskTitle.UPLOAD_TRACES) {
      await this.uploadTracesTask.run();
    }
    Logger.log(`End task ${job.name}`, TaskProcessor.name);
  }
}
