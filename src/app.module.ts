import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks/tasks.service';
import { NumeroModule } from './numeros/numero.module';
import { BaseLocaleModule } from './base_locale/base_locale.module';
import { VoieModule } from './voie/voie.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
       uri: config.get('MONGODB_URL'),
       dbName: config.get('MONGODB_DBNAME'),
      }),
      inject: [ConfigService],
    }),
    NumeroModule,
    BaseLocaleModule,
    VoieModule,
  ],
  controllers: [],
  providers: [TasksService],
})
export class AppModule {
}
