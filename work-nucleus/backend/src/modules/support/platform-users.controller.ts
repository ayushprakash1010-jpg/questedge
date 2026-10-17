import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  Req,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role, UserType } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PlatformUsersService } from './platform-users.service';

@ApiTags('Platform Users (Support Admin)')
@ApiBearerAuth()
@Roles(Role.SUPPORT_REP, Role.SUPPORT_ADMIN)
@Controller('api/v1/support/users')
export class PlatformUsersController {
  constructor(private readonly platformUsersService: PlatformUsersService) {}

  @Get()
  @ApiOperation({ summary: 'Platform: Cross-org user directory' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'role', required: false, enum: Role })
  @ApiQuery({ name: 'userType', required: false, enum: UserType })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'orgId', required: false })
  listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: Role,
    @Query('userType') userType?: UserType,
    @Query('isActive') isActive?: string,
    @Query('orgId') orgId?: string,
  ) {
    return this.platformUsersService.listUsers({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      role,
      userType,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      orgId,
    });
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Platform: User detail with recent activity' })
  getUserDetail(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.platformUsersService.getUserDetail(userId);
  }

  @Patch(':userId/deactivate')
  @Roles(Role.SUPPORT_ADMIN)
  @ApiOperation({
    summary: 'Platform: Deactivate a user account (SUPPORT_ADMIN only)',
  })
  deactivateUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    if (!body.reason || body.reason.trim().length < 10) {
      throw new BadRequestException('Reason must be at least 10 characters');
    }
    return this.platformUsersService.deactivateUser(
      userId,
      req.user.id,
      body.reason,
    );
  }

  @Patch(':userId/activate')
  @Roles(Role.SUPPORT_ADMIN)
  @ApiOperation({
    summary: 'Platform: Reactivate a user account (SUPPORT_ADMIN only)',
  })
  activateUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    if (!body.reason || body.reason.trim().length < 5) {
      throw new BadRequestException('Reason is required');
    }
    return this.platformUsersService.activateUser(
      userId,
      req.user.id,
      body.reason,
    );
  }
}
