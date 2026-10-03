import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RecruiterService } from './recruiter.service';
import { CreateRecruiterProfileDto, UpdateRecruiterProfileDto } from './dto/recruiter-profile.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserTypes } from '../../auth/decorators/user-types.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserType, Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

@ApiTags('Recruiter')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/recruiter')
export class RecruiterController {
  constructor(private readonly recruiterService: RecruiterService) {}

  @Post('profile')
  @ApiOperation({ summary: 'Recruiter: Create profile (called after first Auth0 login)' })
  @ApiResponse({ status: 201, description: 'Profile created' })
  @ApiResponse({ status: 409, description: 'Profile already exists' })
  async createProfile(@CurrentUser() user: any, @Body() dto: CreateRecruiterProfileDto) {
    return this.recruiterService.createProfile(user.auth0Sub, user.email, dto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Recruiter: Get own profile with stats' })
  async getMyProfile(@CurrentUser() user: any) {
    return this.recruiterService.getMyProfile(user.id);
  }

  @Patch('profile')
  @UserTypes(UserType.RECRUITER)
  @ApiOperation({ summary: 'Recruiter: Update own profile' })
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateRecruiterProfileDto) {
    return this.recruiterService.updateProfile(user.id, dto);
  }

  @Get('dashboard')
  @UserTypes(UserType.RECRUITER)
  @ApiOperation({ summary: 'Recruiter: Get full dashboard (earnings, referrals, active mandates)' })
  async getDashboard(@CurrentUser() user: any) {
    return this.recruiterService.getDashboard(user.id);
  }

  @Get(':id/public')
  @ApiOperation({ summary: 'Public: View a recruiter public profile' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getPublicProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.recruiterService.getPublicProfile(id);
  }

  @Post(':id/verify')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Platform Admin: Verify a recruiter' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async verifyRecruiter(@Param('id', ParseUUIDPipe) id: string) {
    return this.recruiterService.verifyRecruiter(id);
  }
}
