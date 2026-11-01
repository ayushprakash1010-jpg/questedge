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
    configService: ConfigService,
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
    });
  }

  private authCache = new Map<string, { profile: any; expiry: number }>();

  async validate(payload: Auth0JwtPayload) {
    const auth0Sub = payload.sub?.trim();
    const userType =
      payload['https://api.questedge.com/user_type'] || 'COMPANY_USER';

    if (!auth0Sub) {
      throw new UnauthorizedException('Invalid token: missing sub claim');
    }

    const rawEmail = (
      payload['https://api.questedge.com/email'] ||
      payload.email ||
      ''
    ).toLowerCase();

    const isDemoAccount =
      rawEmail === 'growytvercel@gmail.com' ||
      (process.env.DEMO_EMAIL &&
        rawEmail === process.env.DEMO_EMAIL.trim().toLowerCase());

    // Check cache (bypassed for demo accounts so role switching is instant)
    if (!isDemoAccount) {
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
    } else if (userType === 'RECRUITER') {
      resolvedProfile = await this.prisma.recruiterProfile.findUnique({
        where: { auth0Sub },
      });
    } else {
      // Defaulted to COMPANY_USER, but let's double check if they are actually a Recruiter or Candidate
      resolvedProfile = await this.prisma.user.findUnique({
        where: { auth0Sub },
        include: { organization: true },
      });

      if (!resolvedProfile) {
        const recruiterProfile = await this.prisma.recruiterProfile.findUnique({
          where: { auth0Sub },
        });
        if (recruiterProfile) {
          resolvedProfile = recruiterProfile;
          actualUserType = 'RECRUITER';
        } else {
          const candidateProfile =
            await this.prisma.candidateProfile.findUnique({
              where: { auth0Sub },
            });
          if (candidateProfile) {
            resolvedProfile = candidateProfile;
            actualUserType = 'CANDIDATE';
          }
        }
      }
    }

    // ── P0-03: Support admin identification ───────────────────
    const supportAdminSubs = (process.env.SUPPORT_ADMIN_SUBS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const isSupportAdmin = supportAdminSubs.includes(auth0Sub);

    if (isSupportAdmin) {
      const emailVerified = payload.email_verified === true;

      if (!emailVerified) {
        this.logger.warn(
          `Support admin sub ${auth0Sub} rejected: email not verified`,
        );
        throw new UnauthorizedException(
          'Email must be verified for platform admin access.',
        );
      }

      if (!resolvedProfile) {
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

        resolvedProfile = await this.prisma.user.create({
          data: {
            auth0Sub,
            email: rawEmail || `${auth0Sub}@platform.questedge.com`,
            name:
              payload['https://api.questedge.com/name'] ||
              payload.name ||
              'Platform Admin',
            role: Role.SUPPORT_ADMIN,
            orgId: platformOrg.id,
            isActive: true,
          },
          include: { organization: true },
        });
      } else if (resolvedProfile.role !== Role.SUPPORT_ADMIN) {
        resolvedProfile = await this.prisma.user.update({
          where: { id: resolvedProfile.id },
          data: {
            role: Role.SUPPORT_ADMIN,
            isActive: true,
          },
          include: { organization: true },
        });
      }
      actualUserType = 'COMPANY_USER';
    }

    if (!resolvedProfile) {
      const unprovisioned = {
        auth0Sub,
        email:
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
