import { Module } from '@nestjs/common';
import { VoieController } from './voie.controller';
import { DbModule } from '@/lib/db/db.module';
import { VoieService } from './voie.service';
import { TilesService } from '@/lib/tiles/tiles.services';

@Module({
  imports: [DbModule],
  providers: [VoieService, TilesService],
  controllers: [VoieController],
})
export class VoieModule {}
