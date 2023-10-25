import { HttpStatus, HttpException } from '@nestjs/common';
import { CustomRequest } from '../types/request.type';
import { Model, Types } from 'mongoose';
import { BaseLocale } from '@/modules/base_locale/schema/base_locale.schema';

export async function isAdmin(
  balId: Types.ObjectId,
  baseLocaleModel: Model<BaseLocale>,
  req: CustomRequest,
) {
  const basesLocale: BaseLocale = await baseLocaleModel
    .findOne({ _id: balId })
    .exec()
    .catch(() => {
      throw new HttpException('Base Local not found', HttpStatus.NOT_FOUND);
    });
  if (!basesLocale) {
    throw new HttpException('Base Local not found', HttpStatus.NOT_FOUND);
  }
  req.baseLocale = basesLocale;
  req.isAdmin = req.headers.token === basesLocale.token;
}
