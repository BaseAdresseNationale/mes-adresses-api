import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';

import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';

import { Habilitation } from '@/modules/base_locale/sub_modules/habilitation/types/habilitation.type';
import { MailerService } from '@/modules/base_locale/sub_modules/mailer/mailer.service';
import { CreateBaseLocaleDTO } from '@/modules/base_locale/dto/create_base_locale.dto';
import { generateBase62String } from '@/lib/utils/token.utils';
import { formatEmail as createBalCreationNotificationEmail } from '@/modules/base_locale/sub_modules/mailer/templates/bal-creation-notification';

@Injectable()
export class BaseLocaleService {
  constructor(
    @InjectModel(BaseLocale.name) private baseLocaleModel: Model<BaseLocale>,
    private readonly mailerService: MailerService,
  ) {}

  findOneOrFail(id: string): Promise<BaseLocale> {
    const filter = {
      _id: id,
    };
    const baseLocale = this.baseLocaleModel.findOne(filter).exec();

    if (!baseLocale) {
      throw new HttpException(
        `BaseLocale ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return baseLocale;
  }

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

  touch(baseLocaleId: Types.ObjectId, _updated: Date = new Date()) {
    return this.baseLocaleModel.updateOne(
      { _id: baseLocaleId },
      { $set: { _updated } },
    );
  }
}
