import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { CustomRequest } from '../types/request.type';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { BaseLocale } from '@/modules/base_locale/schema/base_locale.schema';
import { isAdmin } from './is_admin.util';

@Injectable()
export class BaseLocaleMiddleware implements NestMiddleware {
  constructor(
    @InjectModel(BaseLocale.name) private baseLocaleModel: Model<BaseLocale>,
  ) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    const { baseLocaleId } = req.params;
    if (baseLocaleId) {
      await isAdmin(
        new Types.ObjectId(baseLocaleId),
        this.baseLocaleModel,
        req,
      );
    }
    next();
  }
}
