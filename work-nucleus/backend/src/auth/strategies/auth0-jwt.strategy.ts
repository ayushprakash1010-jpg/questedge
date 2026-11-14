import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

interface Auth0JwtPayload {
  sub: string;
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
    const domain = configService.get<string>('AUTH0_DOMAIN');
    const audience = configService.get<string>('AUTH0_AUDIENCE');

    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${domain}/.well-known/jwks.json`,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer: `https://${domain}/`,
      audience,
      algorithms: ['RS256'],
      passReqToCallback: true,
    });
  }

  private authCache = new Map<string, { profile: any; expiry: number }>();

  async validate(req: any, payload: Auth0JwtPayload) {
    const auth0Sub = payload.sub?.trim();
    const userType =
      payload['https://api.questedge.com/user_type'] || 'COMPANY_USER';

    if (!auth0Sub) {
      throw new UnauthorizedException('Invalid token: missing sub claim');
    }

    let trustedEmail = '';
    const customEmail = payload['https://api.questedge.com/email']?.toLowerCase().trim();
    const tokenEmail = payload.email?.toLowerCase().trim();
    if (customEmail) {
      trustedEmail = customEmail;
    } else if (tokenEmail && payload.email_verified !== false) {
      trustedEmail = tokenEmail;
    }

    // If trustedEmail is still empty, attempt to fetch userinfo from Auth0
    if (!trustedEmail) {
      const domain = this.configService.get<string>('AUTH0_DOMAIN');
      const authHeader = req?.headers?.authorization;
      if (domain && authHeader) {
        try {
          const userInfoRes = await fetch(`https://${domain}/userinfo`, {
            headers: { Authorization: authHeader },
          });
          if (userInfoRes.ok) {
            const userInfo = (await userInfoRes.json()) as any;
            if (userInfo?.email && userInfo.email_verified !== false) {
              trustedEmail = userInfo.email.toLowerCase().trim();
            }
          }
        } catch (e: any) {
          this.logger.warn(`Could not fetch userinfo from Auth0: ${e?.message}`);
        }
      }
    }

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

    // CRITICAL: Only trusted cryptographic email or immutable sub can qualify for admin privileges
    const isDesignatedAdmin =
      supportAdminSubs.includes(auth0Sub) ||
      trustedEmail === 'ayushprakash1110@gmail.com' ||
      (trustedEmail && supportAdminEmails.includes(trustedEmail));

    const isDemoAccount =
      rawEmail === 'growytvercel@gmail.com' ||
      (process.env.DEMO_EMAIL &&
        rawEmail === process.env.DEMO_EMAIL.trim().toLowerCase());

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

      // Safety check: ONLY clear if the record was Ayush Prakash's designated admin account contaminated by another sub!
      if (
        resolvedProfile &&
        rawEmail &&
        !rawEmail.includes('@placeholder.com') &&
        resolvedProfile.email &&
        resolvedProfile.email.toLowerCase() !== rawEmail &&
        resolvedProfile.email.toLowerCase() === 'ayushprakash1110@gmail.com'
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
            await this.prisma.recruiterProfile.update({
              where: { id: recruiterProfile.id },
              data: { email: rawEmail },
            }).catch(() => null);
          }
          resolvedProfile = recruiterProfile;
          actualUserType = 'RECRUITER';
        } else {
          const candidateProfile =
            await this.prisma.candidateProfile.findUnique({
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
              await this.prisma.candidateProfile.update({
                where: { id: candidateProfile.id },
                data: { email: rawEmail },
              }).catch(() => null);
            }
            resolvedProfile = candidateProfile;
            actualUserType = 'CANDIDATE';
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

      const adminEmail = trustedEmail || 'ayushprakash1110@gmail.com';
      const adminName =
        payload['https://api.questedge.com/name'] ||
        payload.name ||
        (isDev ? req?.headers?.['x-user-name'] : undefined) ||
        'Ayush Prakash';

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
              role: Role.SUPPORT_ADMIN,
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
          rawEmail ||
          payload['https://api.questedge.com/email'] ||
          payload.email ||
          `${auth0Sub}@placeholder.com`,
        name: payload['https://api.questedge.com/name'] || payload.name,
        userType: actualUserType,
        isProvisioned: false,
      };
      return unprovisioned;
    }

    if (resolvedProfile.isActive === false) {
      throw new UnauthorizedException('User account is deactivated');
    }

    const finalProfile = {
      ...resolvedProfile,
      userType: actualUserType,
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
