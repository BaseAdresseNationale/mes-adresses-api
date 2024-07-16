import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApiDepotModule } from '@/shared/modules/api_depot/api_depot.module';
import { ExportCsvModule } from '@/shared/modules/export_csv/export_csv.module';
import { PublicationService } from '@/shared/modules/publication/publication.service';
import { MailerModule } from '@/shared/modules/mailer/mailer.module';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Numero } from '@/shared/entities/numero.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BaseLocale, Numero]),
    ApiDepotModule,
    ExportCsvModule,
    MailerModule,
  ],
  providers: [PublicationService],
  exports: [PublicationService],
})
export class PublicationModule {}
