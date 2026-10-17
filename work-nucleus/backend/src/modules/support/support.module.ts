import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';

import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { UserTicketsController } from './user-tickets.controller';
import { SupportAnalyticsController } from './support-analytics.controller';
import { SupportAnalyticsService } from './support-analytics.service';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { ToolsController } from './tools.controller';
import { ToolsService } from './tools.service';

// Phase 2 — New platform admin controllers/services
import { PlatformUsersController } from './platform-users.controller';
import { PlatformUsersService } from './platform-users.service';
import { PlatformMarketplaceController } from './platform-marketplace.controller';
import { PlatformMarketplaceService } from './platform-marketplace.service';
import { PlatformObservabilityController } from './platform-observability.controller';
import { PlatformObservabilityService } from './platform-observability.service';

@Module({
  imports: [AuditModule],
  controllers: [
    SupportController,
    TicketsController,
    UserTicketsController,
    SupportAnalyticsController,
    SessionsController,
    ToolsController,
    // Phase 2 additions
    PlatformUsersController,
    PlatformMarketplaceController,
    PlatformObservabilityController,
  ],
  providers: [
    SupportService,
    TicketsService,
    SupportAnalyticsService,
    SessionsService,
    ToolsService,
    // Phase 2 additions
    PlatformUsersService,
    PlatformMarketplaceService,
    PlatformObservabilityService,
  ],
})
export class SupportModule {}
