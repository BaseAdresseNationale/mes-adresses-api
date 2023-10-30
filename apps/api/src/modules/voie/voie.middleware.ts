import { Injectable, NestMiddleware, Inject, forwardRef } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { CustomRequest } from '../../lib/types/request.type';
import { Voie } from '@/shared/schemas/voie/voie.schema';
import { VoieService } from './voie.service';
import { BaseLocaleService } from '../base_locale/base_locale.service';
import { BaseLocale } from '../base_locale/schema/base_locale.schema';

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
