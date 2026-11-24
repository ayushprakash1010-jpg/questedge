import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { ResumeRankingService } from './resume-ranking.service';
import { ResumeRankingController } from './resume-ranking.controller';
import { EvidenceRankingService } from './evidence-ranking.service';
import { FileUploadModule } from '../file-upload/file-upload.module';
import { RankingScorecardStore } from './ranking-scorecard.store';
import { QuickRankingRunsService } from './quick-ranking-runs.service';

@Module({
  imports: [PrismaModule, ConfigModule, FileUploadModule],
  controllers: [ResumeRankingController],
  providers: [
    ResumeRankingService,
    EvidenceRankingService,
    RankingScorecardStore,
    QuickRankingRunsService,
  ],
  exports: [ResumeRankingService],
})
export class ResumeRankingModule {}
