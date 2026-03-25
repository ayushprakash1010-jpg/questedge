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

@ApiTags('Users (Admin)')
@ApiBearerAuth()
@Controller('api/v1/admin/users')
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users in organization (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  list(
    @CurrentUser('orgId') orgId: string,
    @Query() query: ListUsersQueryDto,
  ) {
    return this.usersService.list(orgId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Invite a new user to the organization' })
  @ApiResponse({ status: 201, description: 'User created and invited' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  create(
    @CurrentUser('orgId') orgId: string,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(orgId, dto);
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
  update(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(orgId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate user (soft delete + Auth0 block)' })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.remove(orgId, id);
  }
}
