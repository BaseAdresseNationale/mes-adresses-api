import { omit } from 'lodash';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';
import { ExtendedBaseLocale } from '../dto/extended_base_locale';

export function filterSensitiveFields(
  baseLocale: BaseLocale | ExtendedBaseLocale,
): Omit<BaseLocale | ExtendedBaseLocale, 'token' | 'emails'> {
  return omit(baseLocale, 'token', 'emails');
}
