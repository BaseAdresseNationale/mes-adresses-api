import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Model , Types} from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Numero } from './../numeros/schema/numero.schema';
import { BasesLocales } from './../bases_locales/bases_locales.schema';

@Injectable()
export class NumeroMiddleware implements NestMiddleware {
  constructor(
    @InjectModel(Numero.name) private numeroModel: Model<Numero>,
    @InjectModel(BasesLocales.name) private baseLocaleModel: Model<BasesLocales>
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const { numeroId } = req.params;
    if (numeroId) {
      const _id = new Types.ObjectId(numeroId)
      const numero: Numero = await this.numeroModel.findOne({ _id }).exec()
      res.locals.numero = numero;
      const basesLocale: BasesLocales = await this.baseLocaleModel.findOne({ _id: numero._bal }).select({token: 1}).exec()
      res.locals.isAdmin = req.headers.token === basesLocale.token
    }
    next();
  }
}
