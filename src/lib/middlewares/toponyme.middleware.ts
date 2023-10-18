import {
  Injectable,
  NestMiddleware,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { CustomRequest } from '../types/request.type';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Toponyme } from '@/modules/toponyme/schema/toponyme.schema';
import { BaseLocale } from '@/modules/base_locale/schema/base_locale.schema';

@Injectable()
export class ToponymeMiddleware implements NestMiddleware {
  constructor(
    @InjectModel(Toponyme.name) private toponymeModel: Model<Toponyme>,
    @InjectModel(BaseLocale.name) private baseLocaleModel: Model<BaseLocale>,
  ) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    const { toponymeId } = req.params;
    if (toponymeId) {
      const toponyme: Toponyme = await this.toponymeModel
        .findOne({ _id: toponymeId })
        .exec()
        .catch(() => {
          throw new HttpException('Toponyme not found', HttpStatus.NOT_FOUND);
        });
      if (!toponyme) {
        throw new HttpException('Toponyme not found', HttpStatus.NOT_FOUND);
      }

      req.toponyme = toponyme;
      const basesLocale: BaseLocale = await this.baseLocaleModel
        .findOne({ _id: toponyme._bal })
        .select({ token: 1 })
        .exec()
        .catch(() => {
          throw new HttpException('Base Local not found', HttpStatus.NOT_FOUND);
        });
      if (!basesLocale) {
        throw new HttpException('Base Local not found', HttpStatus.NOT_FOUND);
      }
      req.token = basesLocale.token;
    }
    next();
  }
}
