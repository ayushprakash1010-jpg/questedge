import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { Auth0JwtStrategy } from './strategies/auth0-jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [AuthController],
  providers: [Auth0JwtStrategy, AuthService],
  exports: [AuthService],
})
export class AuthModule {}
