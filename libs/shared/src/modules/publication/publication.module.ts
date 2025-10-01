import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';

import { ApiDepotModule } from '@/shared/modules/api_depot/api_depot.module';
import { ExportCsvModule } from '@/shared/modules/export_csv/export_csv.module';
import { PublicationService } from '@/shared/modules/publication/publication.service';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Numero } from '@/shared/entities/numero.entity';
import { MailerParams } from '@/shared/params/mailer.params';

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
