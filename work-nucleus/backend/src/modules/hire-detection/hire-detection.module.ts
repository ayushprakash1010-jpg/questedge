import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommsModule } from '../comms/comms.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { HireDetectionService } from './hire-detection.service';
import { HireDetectionController } from './hire-detection.controller';
import { HireDetectionWorker } from './hire-detection.worker';

@Module({
  imports: [PrismaModule, CommsModule, NotificationsModule],
  controllers: [HireDetectionController],
  providers: [HireDetectionService, HireDetectionWorker],
  exports: [HireDetectionService],
})
export class HireDetectionModule {}
