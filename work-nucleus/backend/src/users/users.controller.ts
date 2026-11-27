import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  Optional,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../modules/audit/audit.service';

@ApiTags('Users (Admin)')
@ApiBearerAuth()
@Controller('api/v1/admin/users')
@Roles(Role.ADMIN)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @Optional() private readonly audit?: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List users in organization (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  list(@CurrentUser('orgId') orgId: string, @Query() query: ListUsersQueryDto) {
    return this.usersService.list(orgId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Invite a new user to the organization' })
  @ApiResponse({ status: 201, description: 'User created and invited' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') callerId: string,
    @Body() dto: CreateUserDto,
  ) {
    const created = await this.usersService.create(orgId, dto);
    await this.audit?.logSafe({
      orgId,
      userId: callerId,
      action: 'USER_INVITED',
      entityType: 'USER',
      entityId: created?.id,
      changes: { email: dto.email, role: dto.role },
    });
    return created;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific user' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.findOne(orgId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user role or status' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') callerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const updated = await this.usersService.update(orgId, id, dto, callerId);
    await this.audit?.logSafe({
      orgId,
      userId: callerId,
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: id,
      changes: dto,
    });
    return updated;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate user (soft delete + Auth0 block)' })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('id') callerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.usersService.remove(orgId, id, callerId);
    await this.audit?.logSafe({
      orgId,
      userId: callerId,
      action: 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: id,
    });
    return result;
  }
}
