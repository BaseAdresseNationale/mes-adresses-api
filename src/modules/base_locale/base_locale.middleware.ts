import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { CustomRequest } from '../../lib/middlewares/types/request.type';
import { BaseLocale } from '@/modules/base_locale/schema/base_locale.schema';
import { BaseLocaleService } from './base_locale.service';

@Injectable()
export class BaseLocaleMiddleware implements NestMiddleware {
  constructor(private baseLocaleService: BaseLocaleService) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    const { baseLocaleId } = req.params;
    if (baseLocaleId) {
      const basesLocale: BaseLocale =
        await this.baseLocaleService.findOneOrFail(baseLocaleId);
      req.baseLocale = basesLocale;
      req.isAdmin = req.headers.token === basesLocale.token;
    }
    next();
  }
}
