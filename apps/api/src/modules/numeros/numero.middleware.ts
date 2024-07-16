import { Injectable, NestMiddleware, Inject, forwardRef } from '@nestjs/common';
import { Response, NextFunction } from 'express';

import { Numero } from '@/shared/entities/numero.entity';
import { BaseLocale } from '@/shared/entities/base_locale.entity';

import { CustomRequest } from '@/lib/types/request.type';
import { NumeroService } from '@/modules/numeros/numero.service';
import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { isAdmin } from '@/lib/utils/is-admin.utils';

@Injectable()
export class NumeroMiddleware implements NestMiddleware {
  constructor(
    private numeroService: NumeroService,
    @Inject(forwardRef(() => BaseLocaleService))
    private baseLocaleService: BaseLocaleService,
  ) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    const { numeroId } = req.params;
    if (numeroId) {
      const numero: Numero = await this.numeroService.findOneOrFail(numeroId);
      const basesLocale: BaseLocale =
        await this.baseLocaleService.findOneOrFail(numero.balId.toString());

      req.baseLocale = basesLocale;
      req.numero = numero;
      req.isAdmin = isAdmin(req, basesLocale);
    }
    next();
  }
}
