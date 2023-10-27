import { Injectable, NestMiddleware, Inject, forwardRef } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { CustomRequest } from '../../lib/types/request.type';
import { Numero } from '@/modules/numeros/schema/numero.schema';
import { NumeroService } from './numero.service';
import { BaseLocaleService } from '../base_locale/base_locale.service';
import { BaseLocale } from '../base_locale/schema/base_locale.schema';

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
        await this.baseLocaleService.findOneOrFail(numero._bal.toString());

      req.baseLocale = basesLocale;
      req.numero = numero;
      req.isAdmin = req.headers.token === basesLocale.token;
    }
    next();
  }
}
