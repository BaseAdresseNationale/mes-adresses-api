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
import { Voie } from '@/modules/voie/schema/voie.schema';
import { BaseLocale } from '@/modules/base_locale/schema/base_locale.schema';
import { isAdmin } from './isAdmin.util';

@Injectable()
export class VoieMiddleware implements NestMiddleware {
  constructor(
    @InjectModel(Voie.name) private voieModel: Model<Voie>,
    @InjectModel(BaseLocale.name) private baseLocaleModel: Model<BaseLocale>,
  ) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    const { voieId } = req.params;
    if (voieId) {
      const voie: Voie = await this.voieModel
        .findOne({ _id: voieId })
        .exec()
        .catch(() => {
          throw new HttpException('Voie not found', HttpStatus.NOT_FOUND);
        });
      if (!voie) {
        throw new HttpException('Voie not found', HttpStatus.NOT_FOUND);
      }

      req.voie = voie;
      await isAdmin(voie._bal, this.baseLocaleModel, req);
    }
    next();
  }
}
