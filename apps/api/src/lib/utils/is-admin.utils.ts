import { CustomRequest } from '@/lib/types/request.type';
import { BaseLocale } from '@/shared/entities/base_locale.entity';

export function isSuperAdmin(req: CustomRequest) {
  return req.headers.authorization === `Bearer ${process.env.ADMIN_TOKEN}`;
}

export function isAdmin(req: CustomRequest, baseLocale: BaseLocale) {
  return (
    req.headers.authorization === `Bearer ${baseLocale.token}` ||
    req.headers.authorization === `Bearer ${process.env.ADMIN_TOKEN}`
  );
}
