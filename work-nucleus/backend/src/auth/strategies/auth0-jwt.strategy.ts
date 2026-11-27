import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
import {
  buildTrustedAuth0Issuers,
  normalizeAuth0Domain,
  resolveTrustedUserInfoOrigin,
} from '../auth0-domain.util';

interface Auth0JwtPayload {
  sub: string;
  iss?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  // Namespaced custom claims added via Auth0 Login Action
  'https://api.questedge.com/email'?: string;
  'https://api.questedge.com/name'?: string;
  'https://api.questedge.com/user_type'?: string;
}

@Injectable()
export class Auth0JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(Auth0JwtStrategy.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const domain = normalizeAuth0Domain(
      configService.get<string>('AUTH0_DOMAIN'),
    );
    const managementDomain = normalizeAuth0Domain(
      configService.get<string>('AUTH0_MANAGEMENT_DOMAIN'),
    );
    const audience = configService.get<string>('AUTH0_AUDIENCE');
    const trustedIssuers = buildTrustedAuth0Issuers(domain, managementDomain);
    const issuerOption =
      trustedIssuers.length > 1
        ? (trustedIssuers as [string, ...string[]])
        : trustedIssuers[0] ?? `https://${domain}/`;

    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${domain}/.well-known/jwks.json`,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer: issuerOption,
      audience,
      algorithms: ['RS256'],
      passReqToCallback: true,
    });
    Auth0JwtStrategy.activeInstances.add(this);
  }

  private static activeInstances = new Set<Auth0JwtStrategy>();
  private authCache = new Map<string, { profile: any; expiry: number }>();

  public static invalidateCache(auth0Sub?: string) {
    for (const instance of Auth0JwtStrategy.activeInstances) {
      if (auth0Sub) {
        instance.authCache.delete(auth0Sub);
      } else {
        instance.authCache.clear();
      }
    }
  }

  async validate(req: any, payload: Auth0JwtPayload) {
    const auth0Sub = payload.sub?.trim();
    const userType =
      payload['https://api.questedge.com/user_type'] || 'COMPANY_USER';

    if (!auth0Sub) {
      throw new UnauthorizedException('Invalid token: missing sub claim');
    }

    let isEmailVerified = payload.email_verified === true;
    let tokenEmail = (
      payload['https://api.questedge.com/email'] ||
      payload.email ||
      ''
    ).toLowerCase().trim();

    // If token email is empty or not yet confirmed verified, fetch Auth0 /userinfo
    if (!tokenEmail || !isEmailVerified) {
      const userInfoOrigin = resolveTrustedUserInfoOrigin(
        payload.iss,
        this.configService.get<string>('AUTH0_DOMAIN'),
        this.configService.get<string>('AUTH0_MANAGEMENT_DOMAIN'),
      );
      const authHeader = req?.headers?.authorization;
      if (userInfoOrigin && authHeader) {
        try {
          const userInfoRes = await fetch(`${userInfoOrigin}/userinfo`, {
            headers: { Authorization: authHeader },
          });
          if (userInfoRes.ok) {
            const userInfo = (await userInfoRes.json()) as any;
            if (userInfo?.email) {
              tokenEmail = userInfo.email.toLowerCase().trim();
            }
            if (userInfo?.email_verified === true) {
              isEmailVerified = true;
            }
          }
        } catch (e: any) {
          this.logger.warn(`Could not fetch userinfo from Auth0: ${e?.message}`);
        }
      }
    }

    // Verified email: strictly requires email_verified === true
    const verifiedEmail = isEmailVerified ? tokenEmail : '';
    const trustedEmail = tokenEmail;

    // Client header email: NEVER used for admin checks or privilege grants.
    // In non-production development only, can be a fallback for general user profile lookups.
    const isDev = process.env.NODE_ENV !== 'production';
    const headerEmail = (
      (req?.headers?.['x-user-email'] as string) || ''
    ).toLowerCase().trim();

    let rawEmail = trustedEmail;
    if (!rawEmail && isDev && headerEmail) {
      rawEmail = headerEmail;
    }

    const supportAdminEmails = (process.env.SUPPORT_ADMIN_EMAILS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const supportAdminSubs = (process.env.SUPPORT_ADMIN_SUBS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // CRITICAL SECURITY GUARD:
    // Only strictly verified email (email_verified === true) or immutable sub can qualify for admin privileges
    let isDesignatedAdmin =
      supportAdminSubs.includes(auth0Sub) ||
      (Boolean(verifiedEmail) && supportAdminEmails.includes(verifiedEmail));

    // Check if user was pre-provisioned in database with a support role
    if (!isDesignatedAdmin && verifiedEmail) {
      const preProvisioned = await this.prisma.user.findUnique({
        where: { email: verifiedEmail },
        select: { role: true, isActive: true },
      });
      if (
        preProvisioned &&
        (preProvisioned.role === Role.SUPPORT_ADMIN || preProvisioned.role === Role.SUPPORT_REP)
      ) {
        isDesignatedAdmin = true;
      }
    }

    const demoEmailEnv = process.env.DEMO_EMAIL?.trim().toLowerCase();
    const isDemoAccount =
      (demoEmailEnv ? rawEmail === demoEmailEnv : false) ||
      (process.env.DEMO_AUTH0_SUB &&
        auth0Sub === process.env.DEMO_AUTH0_SUB.trim());

    // Check cache (bypassed for demo accounts and designated admins for instant updates)
    if (!isDemoAccount && !isDesignatedAdmin) {
      const cached = this.authCache.get(auth0Sub);
      if (cached && cached.expiry > Date.now()) {
        if (cached.profile.isActive === false) {
          throw new UnauthorizedException('User account is deactivated');
        }
        return cached.profile;
      }
    }

    let resolvedProfile: any = null;
    let actualUserType = userType;

    if (userType === 'CANDIDATE') {
      resolvedProfile = await this.prisma.candidateProfile.findUnique({
        where: { auth0Sub },
      });
      if (
        resolvedProfile &&
        rawEmail &&
        !rawEmail.includes('@placeholder.com') &&
        resolvedProfile.email?.includes('@placeholder.com')
      ) {
        resolvedProfile.email = rawEmail;
        await this.prisma.candidateProfile.update({
          where: { id: resolvedProfile.id },
          data: { email: rawEmail },
        }).catch(() => null);
      }
    } else if (userType === 'RECRUITER') {
      resolvedProfile = await this.prisma.recruiterProfile.findUnique({
        where: { auth0Sub },
      });
      if (
        resolvedProfile &&
        rawEmail &&
        !rawEmail.includes('@placeholder.com') &&
        resolvedProfile.email?.includes('@placeholder.com')
      ) {
        resolvedProfile.email = rawEmail;
        await this.prisma.recruiterProfile.update({
          where: { id: resolvedProfile.id },
          data: { email: rawEmail },
        }).catch(() => null);
      }
    } else {
      // Defaulted to COMPANY_USER, but let's double check if they are actually a Recruiter or Candidate
      resolvedProfile = await this.prisma.user.findUnique({
        where: { auth0Sub },
        include: { organization: true },
      });

      // 1. Reconnect any unlinked account from previous placeholder era (e.g. GCC in Quest)
      const unlinkedOriginalUser = await this.prisma.user.findFirst({
        where: {
          email: `${auth0Sub}@placeholder.com`,
          auth0Sub: { startsWith: 'unlinked_' },
        },
        include: { organization: true },
      });

      if (unlinkedOriginalUser) {
        if (resolvedProfile && resolvedProfile.id !== unlinkedOriginalUser.id) {
          const dummyOrgId = resolvedProfile.orgId;
          await this.prisma.user.update({
            where: { id: resolvedProfile.id },
            data: {
              auth0Sub: `dummy_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              email: `dummy_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@placeholder.com`,
            },
          }).catch(() => null);
          await this.prisma.user.delete({ where: { id: resolvedProfile.id } }).catch(() => null);
          const remainingUsers = await this.prisma.user.count({ where: { orgId: dummyOrgId } });
          if (remainingUsers === 0) {
            await this.prisma.organization.delete({ where: { id: dummyOrgId } }).catch(() => null);
          }
        }
        resolvedProfile = await this.prisma.user.update({
          where: { id: unlinkedOriginalUser.id },
          data: {
            auth0Sub,
            ...(rawEmail && !rawEmail.includes('@placeholder.com') ? { email: rawEmail } : {}),
          },
          include: { organization: true },
        });
      }

      // Safety check: protect configured support admins from accidental auth0Sub hijack
      if (
        resolvedProfile &&
        rawEmail &&
        !rawEmail.includes('@placeholder.com') &&
        resolvedProfile.email &&
        resolvedProfile.email.toLowerCase() !== rawEmail &&
        supportAdminEmails.includes(resolvedProfile.email.toLowerCase())
      ) {
        this.logger.warn(
          `Sub mismatch in strategy: admin record ${resolvedProfile.email} does not match token email ${rawEmail}. Clearing.`,
        );
        resolvedProfile = null;
      }

      // Auto-upgrade placeholder email if rawEmail is available
      if (
        resolvedProfile &&
        rawEmail &&
        !rawEmail.includes('@placeholder.com') &&
        resolvedProfile.email?.includes('@placeholder.com')
      ) {
        resolvedProfile = await this.prisma.user.update({
          where: { id: resolvedProfile.id },
          data: { email: rawEmail },
          include: { organization: true },
        });
      }

      if (!resolvedProfile) {
        const portalHint = (
          (req?.headers?.['x-demo-role'] || req?.headers?.['x-portal-role']) as string | undefined
        )
          ?.toUpperCase()
          ?.trim();
        const preferCandidate = portalHint === 'CANDIDATE';

        const tryRecruiter = async () => {
          const recruiterProfile = await this.prisma.recruiterProfile.findUnique({
            where: { auth0Sub },
          });
          if (
            recruiterProfile &&
            (!rawEmail ||
              recruiterProfile.email?.includes('@placeholder.com') ||
              rawEmail.includes('@placeholder.com') ||
              recruiterProfile.email?.toLowerCase() === rawEmail)
          ) {
            if (
              rawEmail &&
              !rawEmail.includes('@placeholder.com') &&
              recruiterProfile.email?.includes('@placeholder.com')
            ) {
              recruiterProfile.email = rawEmail;
              await this.prisma.recruiterProfile
                .update({
                  where: { id: recruiterProfile.id },
                  data: { email: rawEmail },
                })
                .catch(() => null);
            }
            resolvedProfile = recruiterProfile;
            actualUserType = 'RECRUITER';
            return true;
          }
          return false;
        };

        const tryCandidate = async () => {
          const candidateProfile = await this.prisma.candidateProfile.findUnique({
            where: { auth0Sub },
          });
          if (
            candidateProfile &&
            (!rawEmail ||
              candidateProfile.email?.includes('@placeholder.com') ||
              rawEmail.includes('@placeholder.com') ||
              candidateProfile.email?.toLowerCase() === rawEmail)
          ) {
            if (
              rawEmail &&
              !rawEmail.includes('@placeholder.com') &&
              candidateProfile.email?.includes('@placeholder.com')
            ) {
              candidateProfile.email = rawEmail;
              await this.prisma.candidateProfile
                .update({
                  where: { id: candidateProfile.id },
                  data: { email: rawEmail },
                })
                .catch(() => null);
            }
            resolvedProfile = candidateProfile;
            actualUserType = 'CANDIDATE';
            return true;
          }
          return false;
        };

        if (preferCandidate) {
          if (!(await tryCandidate())) {
            await tryRecruiter();
          }
        } else {
          if (!(await tryRecruiter())) {
            await tryCandidate();
          }
        }
      }
    }

    if (!rawEmail && resolvedProfile?.email) {
      rawEmail = resolvedProfile.email.toLowerCase().trim();
    }

    // ── P0-03: Support admin identification & promotion ───────
    const isSupportAdmin = isDesignatedAdmin;

    if (isSupportAdmin) {
      let platformOrg = await this.prisma.organization.findFirst({
        where: { name: 'QuestEdge Platform' },
      });
      if (!platformOrg) {
        platformOrg = await this.prisma.organization.create({
          data: {
            name: 'QuestEdge Platform',
            industry: 'Technology',
          },
        });
      }

      const adminEmail = verifiedEmail || `${auth0Sub}@placeholder.com`;
      const adminName =
        payload['https://api.questedge.com/name'] ||
        payload.name ||
        (isDev ? req?.headers?.['x-user-name'] : undefined) ||
        'Platform Admin';

      if (resolvedProfile && 'role' in resolvedProfile) {
        if (resolvedProfile.isActive === false) {
          throw new UnauthorizedException('User account is deactivated');
        }
        if (resolvedProfile.role !== Role.SUPPORT_ADMIN) {
          resolvedProfile = await this.prisma.user.update({
            where: { id: resolvedProfile.id },
            data: {
              role: Role.SUPPORT_ADMIN,
              ...(adminEmail && !resolvedProfile.email ? { email: adminEmail } : {}),
            },
            include: { organization: true },
          });
        }
      } else {
        // Check if user exists by email
        const existingUser = await this.prisma.user.findUnique({
          where: { email: adminEmail },
          include: { organization: true },
        });

        if (existingUser) {
          if (existingUser.isActive === false) {
            throw new UnauthorizedException('User account is deactivated');
          }
          resolvedProfile = await this.prisma.user.update({
            where: { id: existingUser.id },
            data: {
              auth0Sub,
              role:
                existingUser.role === Role.SUPPORT_REP
                  ? Role.SUPPORT_REP
                  : Role.SUPPORT_ADMIN,
            },
            include: { organization: true },
          });
        } else {
          resolvedProfile = await this.prisma.user.upsert({
            where: { auth0Sub },
            update: {
              role: Role.SUPPORT_ADMIN,
              email: adminEmail,
            },
            create: {
              auth0Sub,
              email: adminEmail,
              name: adminName,
              role: Role.SUPPORT_ADMIN,
              orgId: platformOrg.id,
              isActive: true,
            },
            include: { organization: true },
          });
          if (resolvedProfile.isActive === false) {
            throw new UnauthorizedException('User account is deactivated');
          }
        }
      }
      actualUserType = 'COMPANY_USER';
    }

    if (!resolvedProfile) {
      const unprovisioned = {
        auth0Sub,
        email:
          verifiedEmail ||
          rawEmail ||
          payload['https://api.questedge.com/email'] ||
          payload.email ||
          `${auth0Sub}@placeholder.com`,
        emailVerified: isEmailVerified,
        name: payload['https://api.questedge.com/name'] || payload.name,
        userType: actualUserType,
        isProvisioned: false,
      };
      return unprovisioned;
    }

    if (resolvedProfile.isActive === false) {
      throw new UnauthorizedException('User account is deactivated');
    }

    const resolvedUserType =
      actualUserType === 'COMPANY_USER' &&
      'role' in resolvedProfile &&
      resolvedProfile.role === Role.ADMIN
        ? 'COMPANY_ADMIN'
        : actualUserType;

    const finalProfile = {
      ...resolvedProfile,
      emailVerified: isEmailVerified,
      userType: resolvedUserType,
      isProvisioned: true,
    };

    // Cache the resolved profile for 60 seconds (skip demo accounts)
    if (!isDemoAccount && !finalProfile.isDemoAccount) {
      this.authCache.set(auth0Sub, {
        profile: finalProfile,
        expiry: Date.now() + 60000,
      });
    }

    return finalProfile;
  }
}
