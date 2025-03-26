import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  redis = new Redis();

  constructor(private configService: ConfigService) {
    this.redis = new Redis(); //this.configService.get('REDIS_URL'));
  }

  async setFile(key: string, buffer: Buffer): Promise<Buffer> {
    return await this.redis.setBuffer(key, buffer, 'GET');
  }

  async getFile(key: string): Promise<Buffer> {
    return await this.redis.getBuffer(key);
  }

  async del(key: string): Promise<number> {
    return await this.redis.del(key);
  }

  async exists(key: string): Promise<number> {
    return await this.redis.exists(key);
  }
}
