import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * DemoRoleInterceptor
 *
 * When a request carries the `X-Demo-Role` header (COMPANY | RECRUITER | CANDIDATE)
 * AND the authenticated user is flagged `isDemoAccount = true`, this interceptor
 * swaps `req.user` for the matching profile record so that all downstream guards
 * and handlers see the correct userType context — without any JWT/Auth0 changes.
 *
 * Safety contract:
 *  - The header is silently ignored unless `req.user.isDemoAccount === true`.
 *  - The resolved profile MUST also have `isDemoAccount === true` (double-check).
 *  - A missing/unrecognised header value is also silently ignored.
 */
@Injectable()
export class DemoRoleInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DemoRoleInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    // Only act when the caller is a provisioned demo account
    if (!user?.isDemoAccount || !user?.auth0Sub) {
      return next.handle();
    }

    const demoRole = (req.headers['x-demo-role'] as string | undefined)
      ?.toUpperCase()
      ?.trim();

    if (!demoRole || !['COMPANY', 'RECRUITER', 'CANDIDATE'].includes(demoRole)) {
      return next.handle();
    }

    const auth0Sub: string = user.auth0Sub;
    let overrideProfile: any = null;

    if (demoRole === 'COMPANY') {
      overrideProfile = await this.prisma.user.findUnique({
        where: { auth0Sub },
        include: { organization: true },
      });
      if (overrideProfile?.isDemoAccount) {
        req.user = {
          ...overrideProfile,
          userType: 'COMPANY_USER',
          isProvisioned: true,
        };
        this.logger.debug(`Demo role override → COMPANY_USER for ${auth0Sub}`);
      }
    } else if (demoRole === 'RECRUITER') {
      overrideProfile = await this.prisma.recruiterProfile.findUnique({
        where: { auth0Sub },
      });
      if (overrideProfile?.isDemoAccount) {
        req.user = {
          ...overrideProfile,
          userType: 'RECRUITER',
          isProvisioned: true,
        };
        this.logger.debug(`Demo role override → RECRUITER for ${auth0Sub}`);
      }
    } else if (demoRole === 'CANDIDATE') {
      overrideProfile = await this.prisma.candidateProfile.findUnique({
        where: { auth0Sub },
      });
      if (overrideProfile?.isDemoAccount) {
        req.user = {
          ...overrideProfile,
          userType: 'CANDIDATE',
          isProvisioned: true,
        };
        this.logger.debug(`Demo role override → CANDIDATE for ${auth0Sub}`);
      }
    }

    return next.handle();
  }
}

