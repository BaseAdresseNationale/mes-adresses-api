import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BasesLocales, BasesLocalesSchema } from './bases_locales.schema';

@Module({
    imports: [MongooseModule.forFeature([{ name: BasesLocales.name, schema: BasesLocalesSchema }])],
})
export class BasesLocalesModule {}
