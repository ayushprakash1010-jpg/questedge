import {
  Controller, Get, Post, Param, Query, Body, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { StartSessionDto } from './dto/start-session.dto';

@ApiTags('Support Sessions')
@ApiBearerAuth()
@Roles(Role.SUPPORT_REP, Role.SUPPORT_ADMIN)
@Controller('api/v1/support/sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('shadow')
  @ApiOperation({ summary: 'Start a shadow (read-only) session' })
  startShadow(@Body() dto: StartSessionDto, @Req() req: any) {
    return this.sessionsService.startSession({
      ...dto,
      sessionType: 'SHADOW',
      supportUserId: req.user.id,
      ipAddress: req.ip,
    });
  }

  @Post('impersonate')
  @Roles(Role.SUPPORT_ADMIN)
  @ApiOperation({ summary: 'Start an impersonation session (admin only)' })
  startImpersonate(@Body() dto: StartSessionDto, @Req() req: any) {
    return this.sessionsService.startSession({
      ...dto,
      sessionType: 'IMPERSONATE',
      supportUserId: req.user.id,
      ipAddress: req.ip,
    });
  }

  @Post(':id/end')
  @ApiOperation({ summary: 'End a session' })
  endSession(@Param('id') id: string, @Req() req: any) {
    return this.sessionsService.endSession(id, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List session history' })
  listSessions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('orgId') orgId?: string,
    @Query('supportUserId') supportUserId?: string,
  ) {
    return this.sessionsService.listSessions({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      orgId,
      supportUserId,
    });
  }

  @Get('active')
  @ApiOperation({ summary: 'Get currently active sessions' })
  getActiveSessions() {
    return this.sessionsService.getActiveSessions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session detail with actions log' })
  getSession(@Param('id') id: string) {
    return this.sessionsService.getSession(id);
  }
}
