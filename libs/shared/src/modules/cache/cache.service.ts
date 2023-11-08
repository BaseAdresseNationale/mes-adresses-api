import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Cache } from '@/shared/modules/cache/cache.schema';

@Injectable()
export class CacheService {
  constructor(@InjectModel(Cache.name) private cacheModel: Model<Cache>) {}

  public async get(key: string): Promise<any> {
    const cache: any = await this.cacheModel.findOne({ key });

    return cache?.value;
  }

  public async set(key: string, value: any) {
    return this.cacheModel.updateOne(
      { key },
      { $set: { value } },
      { upsert: true },
    );
  }
}
