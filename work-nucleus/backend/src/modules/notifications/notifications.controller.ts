import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('type') type?: string,
  ) {
    const safePage = Math.max(1, parseInt(page || '1', 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
    return this.notificationsService.findAll(user, {
      page: safePage,
      limit: safeLimit,
      unreadOnly: unreadOnly === 'true',
      type,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  getUnreadCount(@CurrentUser() user: any) {
    return this.notificationsService.getUnreadCount(user);
  }

  @Post('mark-read')
  @ApiOperation({ summary: 'Mark specific notifications as read' })
  markAsRead(@CurrentUser() user: any, @Body() body: { ids: string[] }) {
    const safeIds = Array.isArray(body?.ids)
      ? body.ids.filter((id) => typeof id === 'string' && id.length <= 128).slice(0, 100)
      : [];
    return this.notificationsService.markAsRead(user, safeIds);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllRead(user);
  }
}
