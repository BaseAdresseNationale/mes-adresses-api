import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks/tasks.service';
import { NumeroModule } from './modules/numeros/numero.module';
import { BaseLocaleModule } from './modules/base_locale/base_locale.module';
import { VoieModule } from './modules/voie/voie.module';
import { ToponymeModule } from './modules/toponyme/toponyme.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HabilitationModule } from './modules/habilitation/habilitation.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ...(process.env.DISABLE_TASKS === 'true' ? [] : [ScheduleModule.forRoot()]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        uri: config.get('MONGODB_URL'),
        dbName: config.get('MONGODB_DBNAME'),
      }),
      inject: [ConfigService],
    }),
    BaseLocaleModule,
    HabilitationModule,
    NumeroModule,
    VoieModule,
    ToponymeModule,
  ],
  controllers: [],
  providers: [TasksService],
})
export class AppModule {}
