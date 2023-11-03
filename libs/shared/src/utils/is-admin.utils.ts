import { CustomRequest } from '@/lib/types/request.type';
import { BaseLocale } from '../schemas/base_locale/base_locale.schema';

export function isAdmin(req: CustomRequest, baseLocale: BaseLocale) {
  return (
    req.headers.authorization === `Token ${baseLocale.token}` ||
    req.headers.authorization === `Token ${process.env.ADMIN_TOKEN}`
  );
}
