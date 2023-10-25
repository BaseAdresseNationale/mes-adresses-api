import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Numero, NumeroSchema } from '@/modules/numeros/schema/numero.schema';
import { Voie, VoieSchema } from '@/modules/voie/schema/voie.schema';
import {
  Toponyme,
  ToponymeSchema,
} from '@/modules/toponyme/schema/toponyme.schema';
import {
  BaseLocale,
  BaseLocaleSchema,
} from '@/modules/base_locale/schema/base_locale.schema';
import { DbService } from './db.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BaseLocale.name, schema: BaseLocaleSchema },
      { name: Toponyme.name, schema: ToponymeSchema },
      { name: Voie.name, schema: VoieSchema },
      { name: Numero.name, schema: NumeroSchema },
    ]),
  ],
  providers: [DbService],
  exports: [DbService, MongooseModule],
})
export class DbModule {}
