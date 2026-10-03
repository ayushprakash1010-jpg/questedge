import { Module } from '@nestjs/common';
import { CandidatePortalService } from './candidate-portal.service';
import { CandidatePortalController } from './candidate-portal.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiScreeningModule } from '../ai-screening/ai-screening.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, AiScreeningModule, NotificationsModule],
  controllers: [CandidatePortalController],
  providers: [CandidatePortalService],
  exports: [CandidatePortalService],
})
export class CandidatePortalModule {}
