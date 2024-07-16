import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { BaseLocale } from '@/shared/entities/base_locale.entity';

import { CustomRequest } from '@/lib/types/request.type';
import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { isAdmin } from '@/lib/utils/is-admin.utils';

@Injectable()
export class BaseLocaleMiddleware implements NestMiddleware {
  constructor(private baseLocaleService: BaseLocaleService) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    const { baseLocaleId } = req.params;
    if (baseLocaleId) {
      const basesLocale: BaseLocale =
        await this.baseLocaleService.findOneOrFail(baseLocaleId);
      req.baseLocale = basesLocale;
      req.isAdmin = isAdmin(req, basesLocale);
    }
    next();
  }
}
