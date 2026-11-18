import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Event } from '@/shared/entities/event.entity';
import { EventService } from '@/modules/event/event.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event])],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
