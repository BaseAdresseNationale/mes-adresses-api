import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { BaseLocale } from './schema/base_locale.schema';
import { Model } from 'mongoose';
import { Habilitation } from '../habilitation/types/habilitation.type';
import { MailerService } from '@/lib/mailer/mailer.service';

@Injectable()
export class BaseLocaleService {
  constructor(
    @InjectModel(BaseLocale.name) private baseLocaleModel: Model<BaseLocale>,
    private readonly mailerService: MailerService,
  ) {}

  findOne(): Promise<BaseLocale> {}

  findMany(): Promise<BaseLocale[]> {
    return this.baseLocaleModel.find({});
  }

  async createOne(): Promise<BaseLocale> {
    const { nom, emails, commune } = await validPayload(payload, createSchema);

    const baseLocale = {
      _id: new mongo.ObjectId(),
      nom,
      emails,
      commune,
      token: generateBase62String(20),
      status: 'draft',
    };

    mongo.decorateCreation(baseLocale, true);

    await mongo.db.collection('bases_locales').insertOne(baseLocale);
    await this.baseLocaleModel.create(baseLocale);

    const email = createBalCreationNotificationEmail({ baseLocale });
    await this.mailerService.sendMail(email, baseLocale.emails);

    return baseLocale;
  }

  async updateHabilitation(
    baseLocale: BaseLocale,
    habilitation: Habilitation,
  ): Promise<void> {
    await this.baseLocaleModel.updateOne(
      { _id: baseLocale._id },
      { _habilitation: habilitation._id },
    );
  }
}
