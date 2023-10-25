import { Module } from '@nestjs/common';
import { VoieController } from './voie.controller';
import { DbModule } from '@/lib/db/db.module';
import { VoieService } from './voie.service';

@Module({
  imports: [DbModule],
  providers: [VoieService],
  controllers: [VoieController],
})
export class VoieModule {}
