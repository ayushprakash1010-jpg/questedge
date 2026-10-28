import { Module } from '@nestjs/common';
import { CandidatePortalService } from './candidate-portal.service';
import { CandidatePortalController } from './candidate-portal.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiScreeningModule } from '../ai-screening/ai-screening.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FileUploadModule } from '../file-upload/file-upload.module';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';

@Module({
  imports: [
    PrismaModule,
    AiScreeningModule,
    NotificationsModule,
    FileUploadModule,
    MulterModule.register({
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  ],
  controllers: [CandidatePortalController],
  providers: [CandidatePortalService],
  exports: [CandidatePortalService],
})
export class CandidatePortalModule {}
