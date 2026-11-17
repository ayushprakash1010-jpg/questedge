import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { ResumeRankingService } from './resume-ranking.service';
import { ResumeRankingController } from './resume-ranking.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [ResumeRankingController],
  providers: [ResumeRankingService],
  exports: [ResumeRankingService],
})
export class ResumeRankingModule {}
