import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user.role === 'SUPERADMIN') return true;
    if (user.role == 'ADMIN') return true;
    if (!user || !user.role) {
      throw new ForbiddenException(
        'user not found or role not found',
      );
    }
    if (requiredRoles.includes(user.role)) {
      return true;
    }
    throw new ForbiddenException("You don't have permission");
  }
}
