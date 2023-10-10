import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BaseLocale, BaseLocaleSchema } from './schema/base_locale.schema';

@Module({
    imports: [MongooseModule.forFeature([{ name: BaseLocale.name, schema: BaseLocaleSchema }])],
})
export class BaseLocaleModule {}
