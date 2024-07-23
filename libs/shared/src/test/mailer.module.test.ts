import { MailerService } from '@nestjs-modules/mailer';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  providers: [
    {
      provide: MailerService,
      useValue: {
        sendMail: jest.fn(),
      },
    },
  ],
  exports: [MailerService],
})
export class MailerModule {}
