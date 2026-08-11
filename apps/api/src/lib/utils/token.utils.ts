import { randomBytes } from 'crypto';

const TOKEN_CHARSET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
// Plus grand multiple de 62 <= 256, pour rejeter les octets biaisés
const REJECTION_THRESHOLD = 256 - (256 % TOKEN_CHARSET.length);

export function generateToken(length = 20): string {
  let token = '';
  while (token.length < length) {
    for (const byte of randomBytes((length - token.length) * 2)) {
      if (byte >= REJECTION_THRESHOLD) continue;
      token += TOKEN_CHARSET[byte % TOKEN_CHARSET.length];
      if (token.length === length) break;
    }
  }
  return token;
}
