import { Injectable, NestMiddleware, forwardRef, Inject } from '@nestjs/common';
import { Response, NextFunction } from 'express';

import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';

import { CustomRequest } from '@/lib/types/request.type';
import { ToponymeService } from '@/modules/toponyme/toponyme.service';
import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { isAdmin } from '@/shared/utils/is-admin.utils';

@Injectable()
export class ToponymeMiddleware implements NestMiddleware {
  constructor(
    private toponymeService: ToponymeService,
    @Inject(forwardRef(() => BaseLocaleService))
    private baseLocaleService: BaseLocaleService,
  ) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    const { toponymeId } = req.params;
    if (toponymeId) {
      const toponyme: Toponyme =
        await this.toponymeService.findOneOrFail(toponymeId);
      const basesLocale: BaseLocale =
        await this.baseLocaleService.findOneOrFail(toponyme._bal.toString());

      req.baseLocale = basesLocale;
      req.toponyme = toponyme;
      req.isAdmin = isAdmin(req, basesLocale);
    }
    next();
  }
}
