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
 * AND the authenticated user is flagged `isDemoAccount = true` (or matches DEMO_EMAIL),
 * this interceptor swaps `req.user` for the matching profile record so that all downstream
 * guards and handlers see the correct userType context and user.id — without any JWT/Auth0 changes.
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

    // In case header was not sent, infer demo role from the API path
    if (!demoRole) {
      const path = req.path || req.url || '';
      if (path.includes('/recruiter')) {
        demoRole = 'RECRUITER';
      } else if (path.includes('/candidate')) {
        demoRole = 'CANDIDATE';
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
      if (!overrideProfile) {
        // Find existing demo recruiter profile or create one
        overrideProfile = await this.prisma.recruiterProfile.findFirst({
          where: {
            OR: [
              { email: 'growytvercel+recruiter@gmail.com' },
              { email: user.email },
              { isDemoAccount: true },
            ],
          },
        });
        if (overrideProfile) {
          overrideProfile = await this.prisma.recruiterProfile.update({
            where: { id: overrideProfile.id },
            data: { auth0Sub, isDemoAccount: true },
          });
        } else {
          overrideProfile = await this.prisma.recruiterProfile.create({
            data: {
              auth0Sub,
              email: 'growytvercel+recruiter@gmail.com',
              name: 'Demo Recruiter',
              headline: 'Technical Talent Acquisition Specialist',
              experienceYears: 5,
              isVerified: true,
              verifiedAt: new Date(),
              isDemoAccount: true,
            },
          });
        }
      }
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
      if (!overrideProfile) {
        // Find existing demo candidate profile or create one
        overrideProfile = await this.prisma.candidateProfile.findFirst({
          where: {
            OR: [
              { email: 'growytvercel+candidate@gmail.com' },
              { email: user.email },
              { isDemoAccount: true },
            ],
          },
        });
        if (overrideProfile) {
          overrideProfile = await this.prisma.candidateProfile.update({
            where: { id: overrideProfile.id },
            data: { auth0Sub, isDemoAccount: true },
          });
        } else {
          const candidateEmail = 'growytvercel+candidate@gmail.com';
          const emailHash = Buffer.from(candidateEmail).toString('base64');
          overrideProfile = await this.prisma.candidateProfile.create({
            data: {
              auth0Sub,
              email: candidateEmail,
              emailHash,
              name: 'Demo Candidate',
              headline: 'Full-Stack Software Engineer',
              experienceYears: 4,
              currentCompany: 'QuestEdge Labs',
              currentDesignation: 'Senior Developer',
              skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
              isProfileComplete: true,
              isDemoAccount: true,
            },
          });
        }
      }
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
