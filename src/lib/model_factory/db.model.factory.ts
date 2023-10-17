import {
  MongooseModule,
  getModelToken,
  AsyncModelFactory,
} from '@nestjs/mongoose';
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
import { NumeroSchemaFactory } from '@/modules/numeros/schema/numero.factory';

export const DbModelFactory: AsyncModelFactory[] = [
  {
    name: Numero.name,
    useFactory: NumeroSchemaFactory,
    imports: [
      MongooseModule.forFeatureAsync([
        { name: `Numero#${Voie.name}`, useFactory: () => VoieSchema },
        { name: `Numero#${Numero.name}`, useFactory: () => NumeroSchema },
        {
          name: `Numero#${BaseLocale.name}`,
          useFactory: () => BaseLocaleSchema,
        },
      ]),
    ],
    inject: [
      getModelToken(`Numero#${Voie.name}`),
      getModelToken(`Numero#${Numero.name}`),
      getModelToken(`Numero#${BaseLocale.name}`),
    ],
  },
  { name: BaseLocale.name, useFactory: () => BaseLocaleSchema },
  { name: Toponyme.name, useFactory: () => ToponymeSchema },
  { name: Voie.name, useFactory: () => VoieSchema },
];
