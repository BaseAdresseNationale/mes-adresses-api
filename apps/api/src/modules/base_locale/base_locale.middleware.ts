import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';

import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';

import { CustomRequest } from '@/lib/types/request.type';
import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';

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
