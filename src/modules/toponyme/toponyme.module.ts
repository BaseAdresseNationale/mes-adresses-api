import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Toponyme, ToponymeSchema } from './schema/toponyme.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Toponyme.name, schema: ToponymeSchema },
    ]),
  ],
})
export class ToponymeModule {}
