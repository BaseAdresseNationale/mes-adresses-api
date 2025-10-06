import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleTaskService } from './schedule_task.service';
import { ScheduleModule } from '@nestjs/schedule';
import { QUEUE_NAME } from '@/shared/params/queue_name.const';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAME,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
    ScheduleModule.forRoot(),
  ],
  providers: [ScheduleTaskService],
})
export class ScheduleTaskModule {}
