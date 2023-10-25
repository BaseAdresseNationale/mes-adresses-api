import { Module } from '@nestjs/common';
import { VoieController } from './voie.controller';
import { DbModule } from '@/lib/db/db.module';
import { VoieService } from './voie.service';
import { NumeroService } from '@/modules/numeros/numero.service';

@Module({
  imports: [DbModule],
  providers: [VoieService, NumeroService],
  controllers: [VoieController],
})
export class VoieModule {}
