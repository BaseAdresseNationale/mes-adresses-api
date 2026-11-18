import { Module } from '@nestjs/common';
import { CommuneService } from './commune.service';
import { CommuneController } from './commune.controller';

@Module({
  imports: [],
  providers: [CommuneService],
  controllers: [CommuneController],
  exports: [CommuneService],
})
export class CommuneModule {}
