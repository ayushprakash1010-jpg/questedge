import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { JobQueueService } from './job-queue.service';

/**
 * Lightweight admin endpoints to inspect pg-boss queue state.
 * For the full dashboard UI, run:
 *   npx @pg-boss/dashboard --database-url $DATABASE_URL
 */
@Controller('api/v1/admin/jobs')
@Roles(Role.ADMIN)
export class JobDashboardController {
  constructor(private readonly queueService: JobQueueService) {}

  @Get('queues')
  async listQueues() {
    return this.queueService.boss.getQueues();
  }
}
