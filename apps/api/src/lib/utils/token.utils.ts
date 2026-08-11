import { randomBytes } from 'crypto';

export function generateToken(length = 20): string {
  // 20 caractères base64url ≈ 120 bits d'entropie réelle
  return randomBytes(Math.ceil((length * 3) / 4))
    .toString('base64url')
    .slice(0, length);
}
