import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { FileUploadModule } from '../file-upload/file-upload.module';
import { ResumeRankingService } from './resume-ranking.service';
import { ResumeRankingController } from './resume-ranking.controller';

@Module({
  imports: [PrismaModule, ConfigModule, FileUploadModule],
  controllers: [ResumeRankingController],
  providers: [ResumeRankingService],
  exports: [ResumeRankingService],
})
export class ResumeRankingModule {}
