import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

interface Auth0JwtPayload {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  // Namespaced custom claims added via Auth0 Login Action
  'https://api.questedge.com/email'?: string;
  'https://api.questedge.com/name'?: string;
  'https://api.questedge.com/user_type'?: string;
}

@Injectable()
export class Auth0JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
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
    const auth0Sub = payload.sub;
    const userType =
      payload['https://api.questedge.com/user_type'] || 'COMPANY_USER';

    if (!auth0Sub) {
      throw new UnauthorizedException('Invalid token: missing sub claim');
    }

    // Check cache
    const cached = this.authCache.get(auth0Sub);
    if (cached && cached.expiry > Date.now()) {
      if (cached.profile.isActive === false) {
        throw new UnauthorizedException('User account is deactivated');
      }
      if (
        (auth0Sub === 'google-oauth2|103874308553604360098' ||
          process.env.SUPPORT_ADMIN_SUBS?.includes(auth0Sub)) &&
        cached.profile.role !== Role.SUPPORT_ADMIN
      ) {
        this.authCache.delete(auth0Sub);
      } else {
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

    const rawEmail = (
      payload['https://api.questedge.com/email'] ||
      payload.email ||
      ''
    ).toLowerCase();

    const supportAdminEmails = (
      process.env.SUPPORT_ADMIN_EMAILS ||
      'ayushprakash1110@gmail.com,support@questedge.com'
    )
      .toLowerCase()
      .split(',')
      .map((e) => e.trim());

    const supportAdminSubs = (
      process.env.SUPPORT_ADMIN_SUBS ||
      'google-oauth2|103874308553604360098'
    )
      .split(',')
      .map((s) => s.trim());

    const isSupportAdmin =
      supportAdminSubs.includes(auth0Sub) ||
      (rawEmail ? supportAdminEmails.includes(rawEmail) : false);

    const email =
      rawEmail ||
      (isSupportAdmin ? 'ayushprakash1110@gmail.com' : `${auth0Sub}@placeholder.com`);

    if (isSupportAdmin) {
      if (!resolvedProfile) {
        resolvedProfile = await this.prisma.user.findFirst({
          where: {
            OR: [{ auth0Sub }, { email: 'ayushprakash1110@gmail.com' }],
          },
          include: { organization: true },
        });
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
            email,
            name:
              payload['https://api.questedge.com/name'] ||
              payload.name ||
              'Sanchit',
            role: Role.SUPPORT_ADMIN,
            orgId: platformOrg.id,
            isActive: true,
          },
          include: { organization: true },
        });
      } else {
        if (
          resolvedProfile.role !== Role.SUPPORT_ADMIN ||
          resolvedProfile.auth0Sub !== auth0Sub ||
          resolvedProfile.email !== email
        ) {
          resolvedProfile = await this.prisma.user.update({
            where: { id: resolvedProfile.id },
            data: {
              role: Role.SUPPORT_ADMIN,
              auth0Sub,
              email,
              isActive: true,
            },
            include: { organization: true },
          });
        }
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
      // Do not cache unprovisioned profiles so that immediately after creation, the next request sees the new profile
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

    // Cache the resolved profile for 60 seconds
    this.authCache.set(auth0Sub, {
      profile: finalProfile,
      expiry: Date.now() + 60000,
    });

    return finalProfile;
  }
}
