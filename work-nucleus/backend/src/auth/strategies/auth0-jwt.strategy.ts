import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

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
    const userType = payload['https://api.questedge.com/user_type'] || 'COMPANY_USER';

    if (!auth0Sub) {
      throw new UnauthorizedException('Invalid token: missing sub claim');
    }

    // Check cache
    const cached = this.authCache.get(auth0Sub);
    if (cached && cached.expiry > Date.now()) {
      if (cached.profile.isActive === false) {
        throw new UnauthorizedException('User account is deactivated');
      }
      return cached.profile;
    }

    let resolvedProfile: any = null;
    let actualUserType = userType;

    if (userType === 'CANDIDATE') {
      resolvedProfile = await this.prisma.candidateProfile.findUnique({ where: { auth0Sub } });
    } else if (userType === 'RECRUITER') {
      resolvedProfile = await this.prisma.recruiterProfile.findUnique({ where: { auth0Sub } });
    } else {
      // Defaulted to COMPANY_USER, but let's double check if they are actually a Recruiter or Candidate
      resolvedProfile = await this.prisma.user.findUnique({
        where: { auth0Sub },
        include: { organization: true },
      });
      
      if (!resolvedProfile) {
        const recruiterProfile = await this.prisma.recruiterProfile.findUnique({ where: { auth0Sub } });
        if (recruiterProfile) {
          resolvedProfile = recruiterProfile;
          actualUserType = 'RECRUITER';
        } else {
          const candidateProfile = await this.prisma.candidateProfile.findUnique({ where: { auth0Sub } });
          if (candidateProfile) {
            resolvedProfile = candidateProfile;
            actualUserType = 'CANDIDATE';
          }
        }
      }
    }

    if (!resolvedProfile) {
      const unprovisioned = {
        auth0Sub,
        email: payload['https://api.questedge.com/email'] || payload.email || `${auth0Sub}@placeholder.com`,
        name: payload['https://api.questedge.com/name'] || payload.name,
        userType: actualUserType,
        isProvisioned: false,
      };
      this.authCache.set(auth0Sub, { profile: unprovisioned, expiry: Date.now() + 60000 });
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
    this.authCache.set(auth0Sub, { profile: finalProfile, expiry: Date.now() + 60000 });

    return finalProfile;
  }
}
