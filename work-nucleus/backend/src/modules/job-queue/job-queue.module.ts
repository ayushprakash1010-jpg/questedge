import { Module, Global } from '@nestjs/common';
import { JobQueueService } from './job-queue.service';
import { ResumeScoringWorker } from './resume-scoring.worker';
import { JobDashboardController } from './job-dashboard.controller';

@Global()
@Module({
  controllers: [JobDashboardController],
  providers: [JobQueueService, ResumeScoringWorker],
  exports: [JobQueueService],
})
export class JobQueueModule {}
