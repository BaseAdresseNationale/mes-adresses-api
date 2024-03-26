import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

import { CustomRequest } from '@/lib/types/request.type';
import { isSuperAdmin } from '../utils/is-admin.utils';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req: CustomRequest = context.getArgByIndex(0);
    return req.isAdmin;
  }
}

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req: CustomRequest = context.getArgByIndex(0);
    return isSuperAdmin(req);
  }
}
