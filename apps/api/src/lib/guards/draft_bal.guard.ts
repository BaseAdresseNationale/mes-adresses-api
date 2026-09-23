import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

import { CustomRequest } from '@/lib/types/request.type';
import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import {
  BaseLocale,
  StatusBaseLocalEnum,
} from '@/shared/entities/base_locale.entity';
import { isSuperAdmin } from '../utils/is-admin.utils';

@Injectable()
export class DraftBalGuard implements CanActivate {
  constructor(private baseLocaleService: BaseLocaleService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: CustomRequest = context.getArgByIndex(0);
    if (
      req.baseLocale.status !== StatusBaseLocalEnum.DRAFT ||
      req.baseLocale.settings?.otherBalPublishedIgnored ||
      isSuperAdmin(req)
    ) {
      return true;
    }
    const communeBals: BaseLocale[] = await this.baseLocaleService.findMany({
      commune: req.baseLocale.commune,
    });
    return !communeBals.some(
      ({ status }) => status === StatusBaseLocalEnum.PUBLISHED,
    );
  }
}
