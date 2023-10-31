import { Injectable, NestMiddleware, Inject, forwardRef } from '@nestjs/common';
import { Response, NextFunction } from 'express';

import { Voie } from '@/shared/schemas/voie/voie.schema';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';

import { CustomRequest } from '@/lib/types/request.type';
import { VoieService } from '@/modules/voie/voie.service';
import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';

@Injectable()
export class VoieMiddleware implements NestMiddleware {
  constructor(
    private voieService: VoieService,
    @Inject(forwardRef(() => BaseLocaleService))
    private baseLocaleService: BaseLocaleService,
  ) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    const { voieId } = req.params;
    if (voieId) {
      const voie: Voie = await this.voieService.findOneOrFail(voieId);
      const basesLocale: BaseLocale =
        await this.baseLocaleService.findOneOrFail(voie._bal.toString());

      req.baseLocale = basesLocale;
      req.voie = voie;
      req.isAdmin = req.headers.token === basesLocale.token;
    }
    next();
  }
}
