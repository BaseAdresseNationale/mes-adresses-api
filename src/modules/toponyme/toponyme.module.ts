import { Module } from '@nestjs/common';
import { ToponymeController } from './toponyme.controller';
import { DbModule } from '@/lib/db/db.module';
import { ToponymeService } from './toponyme.service';

@Module({
  imports: [DbModule],
  providers: [ToponymeService],
  controllers: [ToponymeController],
})
export class ToponymeModule {}
