import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';

import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Numero } from '@/shared/entities/numero.entity';
import { MailerParams } from '@/shared/params/mailer.params';
import { ApiDepotModule } from '../api_depot/api_depot.module';
import { PublicationService } from './publication.service';
import { ExportCsvModule } from '../export_csv/export_csv.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([BaseLocale, Numero]),
    MailerModule.forRootAsync(MailerParams),
    ApiDepotModule,
    ExportCsvModule,
  ],
  providers: [PublicationService],
  exports: [PublicationService],
})
export class PublicationModule {}
