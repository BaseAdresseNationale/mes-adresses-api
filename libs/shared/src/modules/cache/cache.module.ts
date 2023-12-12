import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Cache, CacheSchema } from '@/shared/modules/cache/cache.schema';
import { CacheService } from './cache.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cache.name, schema: CacheSchema }]),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
