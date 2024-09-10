import { Injectable, NestMiddleware, Inject, forwardRef } from '@nestjs/common';
import { Response, NextFunction } from 'express';

import { Voie } from '@/shared/entities/voie.entity';
import { BaseLocale } from '@/shared/entities/base_locale.entity';

import { CustomRequest } from '@/lib/types/request.type';
import { isAdmin } from '@/lib/utils/is-admin.utils';
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
        await this.baseLocaleService.findOneOrFail(voie.balId);

      req.baseLocale = basesLocale;
      req.voie = voie;
      req.isAdmin = isAdmin(req, basesLocale);
    }
    next();
  }
}
