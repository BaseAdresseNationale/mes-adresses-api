import {
  Injectable,
  NestMiddleware,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Voie } from '@/modules/voie/schema/voie.schema';
import { BaseLocale } from '@/modules/base_locale/schema/base_locale.schema';

@Injectable()
export class VoieMiddleware implements NestMiddleware {
  constructor(
    @InjectModel(Voie.name) private voieModel: Model<Voie>,
    @InjectModel(BaseLocale.name) private baseLocaleModel: Model<BaseLocale>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const { voieId } = req.params;
    if (voieId) {
      const voie: Voie = await this.voieModel
        .findOne({ _id: voieId })
        .exec()
        .catch(() => {
          throw new HttpException('Voie not found', HttpStatus.BAD_REQUEST);
        });
      if (!voie) {
        throw new HttpException('Voie not found', HttpStatus.BAD_REQUEST);
      }

      res.locals.voie = voie;
      const basesLocale: BaseLocale = await this.baseLocaleModel
        .findOne({ _id: voie._bal })
        .select({ token: 1 })
        .exec()
        .catch(() => {
          throw new HttpException(
            'Base Local not found',
            HttpStatus.BAD_REQUEST,
          );
        });
      if (!basesLocale) {
        throw new HttpException('Base Local not found', HttpStatus.BAD_REQUEST);
      }
      res.locals.isAdmin = req.headers.token === basesLocale.token;
    }
    next();
  }
}
