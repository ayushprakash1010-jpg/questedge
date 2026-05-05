import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Push Notifications (v2)')
@ApiBearerAuth()
@Controller('api/v2/push')
export class PushController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('subscribe')
  @ApiOperation({ summary: 'Register a web-push subscription for the current user' })
  async subscribe(
    @CurrentUser('id') userId: string,
    @Body() body: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string },
  ) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      update: { p256dh: body.keys.p256dh, auth: body.keys.auth, userAgent: body.userAgent, userId },
      create: {
        userId,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent: body.userAgent,
      },
    });
  }

  @Delete('subscribe')
  @ApiOperation({ summary: 'Unsubscribe a push endpoint' })
  async unsubscribe(@CurrentUser('id') userId: string, @Body() body: { endpoint: string }) {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint: body.endpoint },
    });
    return { ok: true };
  }

  @Get('mine')
  @ApiOperation({ summary: 'List my push subscriptions' })
  mine(@CurrentUser('id') userId: string) {
    return this.prisma.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, userAgent: true, createdAt: true },
    });
  }
}
