import { ConfigModule, ConfigService } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';

export const MailerParams = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (config: ConfigService) =>
    config.get('SMTP_HOST')
      ? {
          transport: {
            host: config.get('SMTP_HOST'),
            port: config.get('SMTP_PORT'),
            secure: config.get('SMTP_SECURE') === 'YES',
            auth: {
              user: config.get('SMTP_USER'),
              pass: config.get('SMTP_PASS'),
            },
          },
          defaults: {
            from: config.get('SMTP_FROM'),
          },
          template: {
            dir: join(__dirname, '../../../', '/email-templates'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        }
      : {
          transport: {
            streamTransport: true,
            newline: 'unix',
            buffer: true,
          },
        },
};
