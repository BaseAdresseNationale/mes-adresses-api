import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { Email } from './mailer.types';

@Injectable()
export class MailerService {
  private transport: nodemailer.Transporter;

  constructor() {
    if (!process.env.SMTP_HOST && process.env.NODE_ENV === 'production') {
      throw new Error('SMTP_HOST must be provided in production mode');
    }

    this.transport = process.env.SMTP_HOST
      ? nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'YES',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        })
      : nodemailer.createTransport({
          streamTransport: true,
          newline: 'unix',
          buffer: true,
        });
  }

  async sendMail(email: Email, recipients: string[]): Promise<void> {
    if (recipients.length === 0) {
      throw new Error('At least one recipient must be provided');
    }

    const { text, html, subject } = email;

    const info = await this.transport.sendMail({
      text,
      html,
      subject,
      from: process.env.SMTP_FROM,
      to: recipients,
      bcc: process.env.SMTP_BCC ? process.env.SMTP_BCC.split(',') : undefined,
    });

    if (
      process.env.SHOW_EMAILS === 'YES' &&
      this.transport.transporter.options.streamTransport
    ) {
      console.log('-----------------------');
      console.log(info.message.toString());
      console.log('-----------------------');
    }

    return info;
  }
}
