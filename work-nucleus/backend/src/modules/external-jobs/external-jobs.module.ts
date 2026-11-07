import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { JobQueueModule } from '../job-queue/job-queue.module';

// Connectors
import { GreenhouseConnector } from './connectors/greenhouse.connector';
import { LeverConnector } from './connectors/lever.connector';
import { AshbyConnector } from './connectors/ashby.connector';
import { JobicyConnector } from './connectors/jobicy.connector';
import { RemotiveConnector } from './connectors/remotive.connector';
import { RemoteOKConnector } from './connectors/remoteok.connector';

// Services
import { NormalizerService } from './services/normalizer.service';
import { AggregationService } from './services/aggregation.service';
import { ExternalJobsService } from './external-jobs.service';

// Controllers
import { ExternalJobsController } from './external-jobs.controller';
import { ExternalJobsAdminController } from './external-jobs-admin.controller';

// Workers
import { ExternalJobsSyncWorker } from './workers/sync.worker';

@Module({
  imports: [PrismaModule, JobQueueModule],
  controllers: [ExternalJobsController, ExternalJobsAdminController],
  providers: [
    // Connectors
    GreenhouseConnector,
    LeverConnector,
    AshbyConnector,
    JobicyConnector,
    RemotiveConnector,
    RemoteOKConnector,
    // Services
    NormalizerService,
    AggregationService,
    ExternalJobsService,
    // Workers
    ExternalJobsSyncWorker,
  ],
  exports: [ExternalJobsService, AggregationService],
})
export class ExternalJobsModule {}
