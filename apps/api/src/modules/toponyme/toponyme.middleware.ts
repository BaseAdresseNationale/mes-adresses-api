import { Injectable, NestMiddleware, forwardRef, Inject } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { CustomRequest } from '../../lib/types/request.type';
import { Toponyme } from '@/modules/toponyme/schema/toponyme.schema';
import { ToponymeService } from './toponyme.service';
import { BaseLocaleService } from '../base_locale/base_locale.service';
import { BaseLocale } from '../base_locale/schema/base_locale.schema';

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
      req.isAdmin = req.headers.token === basesLocale.token;
    }
    next();
  }
}
