import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { Cache } from '@/shared/entities/cache.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Cache])],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
