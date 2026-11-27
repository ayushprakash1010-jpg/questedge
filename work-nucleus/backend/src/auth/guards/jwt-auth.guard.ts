import { ExecutionContext, Injectable, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { isObservable, lastValueFrom } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { DemoRoleInterceptor } from '../interceptors/demo-role.interceptor';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    @Optional() private readonly demoRole?: DemoRoleInterceptor,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const result = super.canActivate(context);
    const allowed = isObservable(result)
      ? await lastValueFrom(result)
      : await Promise.resolve(result);
    if (!allowed) {
      return false;
    }

    // Resolve X-Demo-Role before RolesGuard evaluates @Roles / @UserTypes
    await this.demoRole?.applyOverride(context);
    return true;
  }
}
