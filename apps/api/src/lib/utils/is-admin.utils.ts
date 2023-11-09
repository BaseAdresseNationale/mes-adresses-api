import { CustomRequest } from '@/lib/types/request.type';
import { BaseLocale } from '../../../../../libs/shared/src/schemas/base_locale/base_locale.schema';

export function isAdmin(req: CustomRequest, baseLocale: BaseLocale) {
  // Dirty hack for swagger...
  const authorizationHeader = req.headers.authorization?.startsWith('Bearer')
    ? req.headers.authorization.replace('Bearer ', '')
    : req.headers.authorization;

  return (
    authorizationHeader === `Token ${baseLocale.token}` ||
    authorizationHeader === `Token ${process.env.ADMIN_TOKEN}`
  );
}
