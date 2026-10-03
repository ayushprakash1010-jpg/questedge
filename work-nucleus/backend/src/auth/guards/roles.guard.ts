import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, UserType } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { USER_TYPES_KEY } from '../decorators/user-types.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredUserTypes = this.reflector.getAllAndOverride<UserType[]>(USER_TYPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length && !requiredUserTypes?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    let hasRole = true;
    let hasUserType = true;

    if (requiredRoles?.length) {
      hasRole = user.role ? requiredRoles.includes(user.role) : false;
    }

    if (requiredUserTypes?.length) {
      hasUserType = user.userType ? requiredUserTypes.includes(user.userType) : false;
    }

    return hasRole && hasUserType;
  }
}
