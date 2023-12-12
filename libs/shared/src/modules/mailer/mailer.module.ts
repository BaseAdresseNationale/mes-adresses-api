import { Module } from '@nestjs/common';

import { MailerService } from '@/shared/modules/mailer/mailer.service';

@Module({
  imports: [],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
