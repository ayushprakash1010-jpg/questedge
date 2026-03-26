import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { SupportAnalyticsController } from './support-analytics.controller';
import { SupportAnalyticsService } from './support-analytics.service';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { ToolsController } from './tools.controller';
import { ToolsService } from './tools.service';

@Module({
  controllers: [
    SupportController,
    TicketsController,
    SupportAnalyticsController,
    SessionsController,
    ToolsController,
  ],
  providers: [
    SupportService,
    TicketsService,
    SupportAnalyticsService,
    SessionsService,
    ToolsService,
  ],
})
export class SupportModule {}
