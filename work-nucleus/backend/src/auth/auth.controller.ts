import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ProvisionDto } from './dto/provision.dto';
import { SyncDto } from './dto/sync.dto';
import { DemoProvisionDto } from './dto/demo-provision.dto';
import { DemoSwitchRoleDto } from './dto/demo-switch-role.dto';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('provision')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Provision new organization and admin user after first Auth0 login',
  })
  @ApiResponse({ status: 201, description: 'Organization and user created' })
  @ApiResponse({ status: 409, description: 'User already provisioned' })
  async provision(@CurrentUser() user: any, @Body() dto: ProvisionDto) {
    if (!user?.auth0Sub) {
      throw new BadRequestException('Auth0 identity not found in token');
    }

    const email = user.email || dto.email;
    if (!email) {
      throw new BadRequestException('Email not found in token or payload');
    }

    return this.authService.provision(user.auth0Sub, email, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile from local DB' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  async me(@CurrentUser() user: any) {
    if (!user?.auth0Sub) {
      throw new BadRequestException('Auth0 identity not found in token');
    }

    // First check company users table
    const profile = await this.authService.getMe(user.auth0Sub);
    if (profile) {
      return { isProvisioned: true, userType: 'COMPANY_USER', ...profile };
    }

    // Check recruiter profiles table
    const recruiterProfile = await this.authService.getRecruiterMe(
      user.auth0Sub,
    );
    if (recruiterProfile) {
      return {
        isProvisioned: true,
        userType: 'RECRUITER',
        ...recruiterProfile,
      };
    }

    // Check candidate profiles table
    const candidateProfile = await this.authService.getCandidateMe(
      user.auth0Sub,
    );
    if (candidateProfile) {
      return {
        isProvisioned: true,
        userType: 'CANDIDATE',
        ...candidateProfile,
      };
    }

    return {
      isProvisioned: false,
      auth0Sub: user.auth0Sub,
      email: user.email,
    };
  }

  @Post('reset-role')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Reset a mistakenly chosen role (only if no active associations exist)',
  })
  @ApiResponse({ status: 200, description: 'Role reset successfully' })
  @ApiResponse({
    status: 409,
    description: 'Cannot reset role due to active associations',
  })
  async resetRole(@CurrentUser() user: any) {
    if (!user?.auth0Sub) {
      throw new BadRequestException('Auth0 identity not found in token');
    }
    return this.authService.resetRole(user.auth0Sub);
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

  // -------------------------------------------------------------------------
  // DEMO ACCOUNT ENDPOINTS
  // -------------------------------------------------------------------------

  @Post('demo/provision')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Provision all 3 demo profiles (Company, Recruiter, Candidate) for one Auth0 account',
    description:
      'Creates a Company user, RecruiterProfile and CandidateProfile all linked to the same ' +
      'Auth0 sub, flagged isDemoAccount=true. Safe to call on a fresh account only.',
  })
  @ApiResponse({ status: 201, description: 'Demo account provisioned' })
  @ApiResponse({ status: 409, description: 'Account already provisioned or is a real account' })
  async provisionDemo(
    @CurrentUser() user: any,
    @Body() dto: DemoProvisionDto,
  ) {
    if (!user?.auth0Sub) {
      throw new BadRequestException('Auth0 identity not found in token');
    }
    const email = user.email || dto.email;
    if (!email) {
      throw new BadRequestException('Email not found in token or payload');
    }
    return this.authService.provisionDemo(user.auth0Sub, email, dto);
  }

  @Post('demo/switch-role')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Return profile data for a specific demo role context',
    description:
      'Returns the profile for the requested role (COMPANY | RECRUITER | CANDIDATE). ' +
      'The frontend should store this and pass X-Demo-Role header on subsequent API calls.',
  })
  @ApiHeader({
    name: 'X-Demo-Role',
    description: 'Pass this header on all subsequent requests to operate as that role: COMPANY | RECRUITER | CANDIDATE',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Demo role profile returned' })
  @ApiResponse({ status: 401, description: 'Not a demo account' })
  @ApiResponse({ status: 404, description: 'Target role profile not found' })
  async switchDemoRole(
    @CurrentUser() user: any,
    @Body() dto: DemoSwitchRoleDto,
  ) {
    if (!user?.auth0Sub) {
      throw new BadRequestException('Auth0 identity not found in token');
    }

    const result = await this.authService.getDemoRoleProfile(
      user.auth0Sub,
      dto.targetRole,
    );

    if (!result) {
      throw new UnauthorizedException(
        'Not a demo account or the requested role profile has not been provisioned.',
      );
    }

    return result;
  }
}