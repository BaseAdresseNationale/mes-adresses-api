import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks/tasks.service';
import { NumerosModule } from './numeros/numeros.module';
import { BasesLocalesModule } from './bases_locales/bases_locales.module';

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
    NumerosModule,
    BasesLocalesModule,
  ],
  controllers: [],
  providers: [TasksService],
})
export class AppModule {
}
