import { Logger } from '@/shared/utils/logger.utils';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TaskTitle } from '@/shared/types/task.type';
import { QUEUE_NAME } from '@/shared/params/queue_name.const';
import { DetectOutdatedTask } from './tasks/detect_outdated.task';
import { DetectConflictTask } from './tasks/detect_conflict.task';
import { SyncOutdatedTask } from './tasks/sync_outdated.task';
import { RemoveSoftDeleteBalTask } from './tasks/remove_soft_delete_bal.task';
import { RemoveDemoBalTask } from './tasks/remove_demo_bal.task';
import { UploadTracesTask } from './tasks/upload_traces.task';
import { ForcePublishTask } from './tasks/force_publish.task';
import { ResetCommuneForWebinaireTask } from './tasks/reset_commune_for_webinaire.task';

@Processor(QUEUE_NAME)
export class TaskProcessor extends WorkerHost {
  constructor(
    private readonly detectOutdatedTask: DetectOutdatedTask,
    private readonly detectConflictTask: DetectConflictTask,
    private readonly syncOutdatedTask: SyncOutdatedTask,
    private readonly removeSoftDeleteBalTask: RemoveSoftDeleteBalTask,
    private readonly removeDemoBalTask: RemoveDemoBalTask,
    private readonly uploadTracesTask: UploadTracesTask,
    private readonly forcePublishTask: ForcePublishTask,
    private readonly resetCommuneForWebinaireTask: ResetCommuneForWebinaireTask,
  ) {
    super();
  }

  async process(job: Job) {
    Logger.info(
      `[${TaskProcessor.name}] Start task ${job.name}`,
      TaskProcessor.name,
    );
    try {
      switch (job.name) {
        case TaskTitle.DETECT_OUTDATED:
          await this.detectOutdatedTask.run();
          break;
        case TaskTitle.DETECT_CONFLICT:
          await this.detectConflictTask.run();
          break;
        case TaskTitle.SYNC_OUTDATED:
          await this.syncOutdatedTask.run();
          break;
        case TaskTitle.FORCE_PUBLISH:
          await this.forcePublishTask.run(job.data.balId);
          break;
        case TaskTitle.REMOVE_SOFT_DELETE_BAL:
          await this.removeSoftDeleteBalTask.run();
          break;
        case TaskTitle.REMOVE_DEMO_BAL:
          await this.removeDemoBalTask.run();
          break;
        case TaskTitle.UPLOAD_TRACES:
          await this.uploadTracesTask.run();
          break;
        case TaskTitle.RESET_COMMUNE_FOR_WEBINAIRE:
          await this.resetCommuneForWebinaireTask.run();
          break;
        default:
          Logger.warn(
            `[${TaskProcessor.name}] Unknown task ${job.name}`,
            TaskProcessor.name,
          );
          break;
      }
    } catch (error) {
      Logger.error(
        `[${TaskProcessor.name}] Error task ${job.name}`,
        error.message || error.response?.data,
        TaskProcessor.name,
      );
      return { success: false, error: error.message || error.response?.data };
    }
    Logger.info(
      `[${TaskProcessor.name}] End task ${job.name}`,
      TaskProcessor.name,
    );
    return { success: true };
  }
}
