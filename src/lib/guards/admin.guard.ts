import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { CustomRequest } from '@/lib/middlewares/types/request.type';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req: CustomRequest = context.getArgByIndex(0);
    return req.isAdmin;
  }
}
