import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Voie, VoieSchema } from './schema/voie.schema';

@Module({
    imports: [MongooseModule.forFeature([{ name: Voie.name, schema: VoieSchema }])],
})
export class VoieModule {}
