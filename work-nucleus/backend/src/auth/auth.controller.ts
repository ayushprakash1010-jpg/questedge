import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ProvisionDto } from './dto/provision.dto';
import { SyncDto } from './dto/sync.dto';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('provision')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Provision new organization and admin user after first Auth0 login',
  })
  @ApiResponse({ status: 201, description: 'Organization and user created' })
  @ApiResponse({ status: 409, description: 'User already provisioned' })
  async provision(
    @CurrentUser() user: any,
    @Body() dto: ProvisionDto,
  ) {
    if (!user?.auth0Sub) {
      throw new BadRequestException('Auth0 identity not found in token');
    }

    return this.authService.provision(user.auth0Sub, user.email, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile from local DB' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  async me(@CurrentUser() user: any) {
    if (!user?.auth0Sub) {
      throw new BadRequestException('Auth0 identity not found in token');
    }

    const profile = await this.authService.getMe(user.auth0Sub);

    if (!profile) {
      return {
        isProvisioned: false,
        auth0Sub: user.auth0Sub,
        email: user.email,
      };
    }

    return { isProvisioned: true, ...profile };
  }

  @Post('sync')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook: sync Auth0 profile changes to local DB' })
  @ApiResponse({ status: 200, description: 'Profile synced' })
  @ApiResponse({ status: 401, description: 'Invalid webhook secret' })
  async sync(
    @Body() dto: SyncDto,
    @Headers('x-auth0-webhook-secret') webhookSecret: string,
  ) {
    return this.authService.syncFromAuth0(dto, webhookSecret);
  }
}
