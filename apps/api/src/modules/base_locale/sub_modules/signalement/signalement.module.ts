import { Module } from '@nestjs/common';
import { SignalementService } from './signalement.service';
import { ConfigModule } from '@nestjs/config';
import { SignalementController } from './signalement.controller';

@Module({
  imports: [ConfigModule],
  providers: [SignalementService],
  controllers: [SignalementController],
  exports: [SignalementService],
})
export class SignalementModule {}
