import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks/tasks.service';
import { NumeroModule } from './modules/numeros/numero.module';
import { BaseLocaleModule } from './modules/base_locale/base_locale.module';
import { VoieModule } from './modules/voie/voie.module';
import { ToponymeModule } from './modules/toponyme/toponyme.module';
import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
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

const db: AsyncModelFactory[] = [
  {
    name: Numero.name,
    useFactory: NumeroSchemaFactory,
    imports: [
      MongooseModule.forFeature([{ name: Voie.name, schema: VoieSchema }]),
    ],
    inject: [getModelToken(Voie.name)],
  },
  { name: BaseLocale.name, useFactory: () => BaseLocaleSchema },
  { name: Toponyme.name, useFactory: () => ToponymeSchema },
  { name: Voie.name, useFactory: () => VoieSchema },
];

@Module({
  imports: [
    ConfigModule.forRoot(),
    // ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        uri: config.get('MONGODB_URL'),
        dbName: config.get('MONGODB_DBNAME'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeatureAsync(db),
    BaseLocaleModule,
    NumeroModule,
    VoieModule,
    ToponymeModule,
  ],
  controllers: [],
  providers: [TasksService],
})
export class AppModule {}
