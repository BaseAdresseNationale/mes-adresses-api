import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleTaskService } from './schedule_task.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'task',
    }),
    ScheduleModule.forRoot(),
  ],
  providers: [ScheduleTaskService],
})
export class ScheduleTaskModule {}
