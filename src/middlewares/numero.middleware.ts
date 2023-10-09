import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Model , Types} from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Numeros } from './../numeros/numeros.schema';
import { BasesLocales } from './../bases_locales/bases_locales.schema';

@Injectable()
export class NumeroMiddleware implements NestMiddleware {
  constructor(
    @InjectModel(Numeros.name) private numerosModel: Model<Numeros>,
    @InjectModel(BasesLocales.name) private basesLocalesModel: Model<BasesLocales>
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const { numeroId } = req.params;
    if (numeroId) {
      console.log('numeroId', numeroId);
      const _id = new Types.ObjectId(numeroId)
      const numero: Numeros = await this.numerosModel.findOne({ _id }).exec()
      console.log(numero)
      res.locals.numero = numero;
      const basesLocale: BasesLocales = await this.basesLocalesModel.findOne({ _id: numero._bal }).select({token: 1}).exec()
      console.log(basesLocale)
    }
    next();
  }
}
