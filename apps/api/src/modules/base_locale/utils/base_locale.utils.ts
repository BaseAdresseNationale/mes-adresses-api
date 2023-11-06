import { omit } from 'lodash';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';
import { ExtendedBaseLocale } from '@/modules/base_locale/dto/extended_base_locale';

export function filterSensitiveFields(
  baseLocale: BaseLocale | ExtendedBaseLocale,
): Omit<BaseLocale | ExtendedBaseLocale, 'token' | 'emails'> {
  return omit(baseLocale, 'token', 'emails');
}

export function checkValidEmail(email: string): boolean {
  // This regex checks for:
  // 1. Forbidden characters such as angle brackets, square brackets, double quotes, backslashes, commas, semicolons, colons, spaces, and at signs.
  // 2. Quoted email addresses.
  // 3. IP addresses within square brackets.
  // 4. Domains with hyphens.
  // 5. Domains with numbers.
  // 6. Domains with extensions of 2 or more characters.
  const regex =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[(?:\d{1,3}\.){3}\d{1,3}])|(([a-zA-Z\-\d]+\.)+[a-zA-Z]{2,}))$/;
  return regex.test(email);
}
