import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { USER_TYPES_KEY } from '../decorators/user-types.decorator';
import { createHash } from 'crypto';

/**
 * DemoRoleInterceptor
 *
 * When a request carries the `X-Demo-Role` header (COMPANY | RECRUITER | CANDIDATE)
 * OR is inferred from page referer, API path, cookie, or route @UserTypes decorator,
 * AND the authenticated user is flagged `isDemoAccount = true` (or matches DEMO_EMAIL),
 * this interceptor swaps `req.user` for the matching profile record so that all downstream
 * guards and handlers see the correct userType context and user.id — without any JWT/Auth0 changes.
 */
@Injectable()
export class DemoRoleInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DemoRoleInterceptor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly reflector?: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    const isDemo =
      user?.isDemoAccount === true ||
      user?.email?.toLowerCase() === 'growytvercel@gmail.com' ||
      (process.env.DEMO_EMAIL &&
        user?.email?.toLowerCase() === process.env.DEMO_EMAIL.trim().toLowerCase());

    // Only act when the caller is a provisioned demo account
    if (!isDemo || !user?.auth0Sub) {
      return next.handle();
    }

    let demoRole = (req.headers['x-demo-role'] as string | undefined)
      ?.toUpperCase()
      ?.trim();

    // 1. Check Cookie header if header not provided
    if (!demoRole && req.headers['cookie']) {
      const match = req.headers['cookie'].match(/(?:^|;\s*)demo_role=([^;]+)/);
      if (match) {
        demoRole = decodeURIComponent(match[1]).toUpperCase().trim();
      }
    }

    // 2. Check Referer header (browser URL page that initiated the call)
    if (!demoRole) {
      const referer = (req.headers['referer'] || req.headers['referrer'] || '') as string;
      if (referer.includes('/recruiter')) {
        demoRole = 'RECRUITER';
      } else if (referer.includes('/candidates')) {
        demoRole = 'COMPANY';
      } else if (referer.includes('/candidate/') || referer.endsWith('/candidate')) {
        demoRole = 'CANDIDATE';
      } else if (
        referer.includes('/dashboard') ||
        referer.includes('/mandates') ||
        referer.includes('/admin') ||
        referer.includes('/company')
      ) {
        demoRole = 'COMPANY';
      }
    }

    // 3. In case role still not resolved, infer demo role from the API path
    if (!demoRole) {
      const path = req.path || req.url || '';
      if (
        path.includes('/recruiter') ||
        path.startsWith('/api/v1/referrals') ||
        path.includes('/rewards/recruiter')
      ) {
        demoRole = 'RECRUITER';
      } else if (path.startsWith('/api/v1/candidates') || path.startsWith('/api/v1/mandates')) {
        demoRole = 'COMPANY';
      } else if (path.includes('/candidate')) {
        demoRole = 'CANDIDATE';
      }
    }

    // 4. In case still not resolved, infer from route @UserTypes() decorator
    if (!demoRole && this.reflector) {
      const requiredUserTypes = this.reflector.getAllAndOverride<string[]>(
        USER_TYPES_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (requiredUserTypes?.length) {
        if (requiredUserTypes.includes('RECRUITER')) {
          demoRole = 'RECRUITER';
        } else if (requiredUserTypes.includes('CANDIDATE')) {
          demoRole = 'CANDIDATE';
        } else if (
          requiredUserTypes.includes('COMPANY_USER') ||
          requiredUserTypes.includes('COMPANY_ADMIN')
        ) {
          demoRole = 'COMPANY';
        }
      }
    }

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
      if (overrideProfile) {
        req.user = {
          ...overrideProfile,
          userType: 'COMPANY_USER',
          isProvisioned: true,
          isDemoAccount: true,
        };
        this.logger.debug(`Demo role override → COMPANY_USER for ${auth0Sub}`);
      }
    } else if (demoRole === 'RECRUITER') {
      overrideProfile = await this.prisma.recruiterProfile.findUnique({
        where: { auth0Sub },
      });
      if (overrideProfile) {
        req.user = {
          ...overrideProfile,
          userType: 'RECRUITER',
          isProvisioned: true,
          isDemoAccount: true,
        };
        this.logger.debug(`Demo role override → RECRUITER for ${auth0Sub}`);
      }
    } else if (demoRole === 'CANDIDATE') {
      overrideProfile = await this.prisma.candidateProfile.findUnique({
        where: { auth0Sub },
      });
      if (overrideProfile) {
        req.user = {
          ...overrideProfile,
          userType: 'CANDIDATE',
          isProvisioned: true,
          isDemoAccount: true,
        };
        this.logger.debug(`Demo role override → CANDIDATE for ${auth0Sub}`);
      }
    }

    return next.handle();
  }
}
