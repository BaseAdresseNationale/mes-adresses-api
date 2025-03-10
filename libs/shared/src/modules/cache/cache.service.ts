import { Cache } from '@/shared/entities/cache.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CacheService {
  constructor(
    @InjectRepository(Cache)
    private cacheRepository: Repository<Cache>,
  ) {}

  get(key: string) {
    return this.cacheRepository.findOne({ where: { key } });
  }

  async del(key: string) {
    return await this.cacheRepository.delete(key);
  }

  async set(key: string, value: string) {
    const existingCache = await this.cacheRepository.findOne({
      where: { key },
    });
    if (existingCache) {
      existingCache.value = value;
      return this.cacheRepository.save(existingCache);
    }

    return this.cacheRepository.save({ key, value });
  }
}
