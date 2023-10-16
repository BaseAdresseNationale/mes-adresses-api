import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DbModelFactory } from '@/lib/model_factory/db.model.factory';

@Module({
  imports: [MongooseModule.forFeatureAsync(DbModelFactory)],
})
export class BaseLocaleModule {}
