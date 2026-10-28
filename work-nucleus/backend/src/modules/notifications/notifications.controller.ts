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
    return this.notificationsService.findAll(user, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
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
    return this.notificationsService.markAsRead(user, body.ids || []);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllRead(user);
  }
}
