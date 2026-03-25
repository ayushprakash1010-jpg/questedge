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

  async validate(payload: Auth0JwtPayload) {
    const auth0Sub = payload.sub;

    if (!auth0Sub) {
      throw new UnauthorizedException('Invalid token: missing sub claim');
    }

    const user = await this.prisma.user.findUnique({
      where: { auth0Sub },
      include: { organization: true },
    });

    // User not provisioned yet — return minimal info for /auth/provision
    if (!user) {
      return {
        auth0Sub,
        email: payload.email,
        name: payload.name,
        isProvisioned: false,
      };
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    return {
      id: user.id,
      orgId: user.orgId,
      email: user.email,
      name: user.name,
      role: user.role,
      auth0Sub: user.auth0Sub,
      organization: user.organization,
      isProvisioned: true,
    };
  }
}
