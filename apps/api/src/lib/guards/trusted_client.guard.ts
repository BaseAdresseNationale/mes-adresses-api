import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { timingSafeEqual } from 'crypto';

import { CustomRequest } from '@/lib/types/request.type';

export const TRUSTED_CLIENT_SECRET_HEADER = 'x-client-secret';

function safeEqual(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  // timingSafeEqual exige des buffers de même taille
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export function isTrustedClient(req: CustomRequest): boolean {
  const expected = process.env.MES_DONNEES_GEO_CLIENT_SECRET;
  const received = req.headers[TRUSTED_CLIENT_SECRET_HEADER];
  // Si le secret n'est pas configuré, personne n'est autorisé
  if (!expected || typeof received !== 'string') {
    return false;
  }

  return safeEqual(received, expected);
}

@Injectable()
export class TrustedClientGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req: CustomRequest = context.getArgByIndex(0);
    return isTrustedClient(req);
  }
}
