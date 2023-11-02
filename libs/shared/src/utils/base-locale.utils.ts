import { omit } from 'lodash';
import { BaseLocale } from '../schemas/base_locale/base_locale.schema';

export function filterSensitiveFields(
  baseLocale: BaseLocale,
): Omit<BaseLocale, 'token' | 'emails'> {
  return omit(baseLocale, 'token', 'emails');
}
