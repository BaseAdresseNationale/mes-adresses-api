import {
  Injectable,
  NestMiddleware,
  HttpStatus,
  HttpException,
  Inject,
} from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { CustomRequest } from '../types/request.type';
import { Model } from 'mongoose';
import { InjectModel, getModelToken } from '@nestjs/mongoose';
import { Numero } from '@/modules/numeros/schema/numero.schema';
import { BaseLocale } from '@/modules/base_locale/schema/base_locale.schema';
import { isAdmin } from './isAdmin.util';

@Injectable()
export class NumeroMiddleware implements NestMiddleware {
  constructor(
    @Inject(getModelToken(Numero.name)) private numeroModel: Model<Numero>,
    @InjectModel(BaseLocale.name) private baseLocaleModel: Model<BaseLocale>,
  ) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    const { numeroId } = req.params;
    if (numeroId) {
      const numero: Numero = await this.numeroModel
        .findOne({ _id: numeroId })
        .exec()
        .catch(() => {
          throw new HttpException('Numero not found', HttpStatus.NOT_FOUND);
        });
      if (!numero) {
        throw new HttpException('Numero not found', HttpStatus.NOT_FOUND);
      }

      req.numero = numero;
      await isAdmin(numero._bal, this.baseLocaleModel, req);
    }
    next();
  }
}
