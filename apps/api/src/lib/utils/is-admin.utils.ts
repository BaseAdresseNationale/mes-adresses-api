import { CustomRequest } from '@/lib/types/request.type';
import { BaseLocale } from '../../../../../libs/shared/src/schemas/base_locale/base_locale.schema';

export function isSuperAdmin(req: CustomRequest) {
  return req.headers.authorization === `Bearer ${process.env.ADMIN_TOKEN}`;
}

export function isAdmin(req: CustomRequest, baseLocale: BaseLocale) {
  return (
    req.headers.authorization === `Bearer ${baseLocale.token}` ||
    req.headers.authorization === `Bearer ${process.env.ADMIN_TOKEN}`
  );
}
