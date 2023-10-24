import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { BaseLocale } from './schema/base_locale.schema';
import { FilterQuery, Model } from 'mongoose';
import { Habilitation } from '../habilitation/types/habilitation.type';
import { MailerService } from '@/lib/mailer/mailer.service';
import { CreateBaseLocaleDTO } from './dto/create_base_locale.dto';
import { generateBase62String } from '@/lib/utils/token.utils';
import { formatEmail as createBalCreationNotificationEmail } from '@/lib/mailer/templates/bal-creation-notification';

@Injectable()
export class BaseLocaleService {
  constructor(
    @InjectModel(BaseLocale.name) private baseLocaleModel: Model<BaseLocale>,
    private readonly mailerService: MailerService,
  ) {}

  findOne(filter?: FilterQuery<BaseLocale>): Promise<BaseLocale> {
    return this.baseLocaleModel.findOne(filter);
  }

  findMany(filter?: FilterQuery<BaseLocale>): Promise<BaseLocale[]> {
    return this.baseLocaleModel.find(filter);
  }

  async createOne(createInput: CreateBaseLocaleDTO): Promise<BaseLocale> {
    const newBaseLocale = await this.baseLocaleModel.create({
      ...createInput,
      token: generateBase62String(20),
      status: 'draft',
    });

    const email = createBalCreationNotificationEmail({
      baseLocale: newBaseLocale,
    });
    await this.mailerService.sendMail(email, newBaseLocale.emails);

    return newBaseLocale;
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
