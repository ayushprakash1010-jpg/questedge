import { Module } from '@nestjs/common';
import { AiScreeningService } from './ai-screening.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { FileUploadModule } from '../file-upload/file-upload.module';

@Module({
  imports: [PrismaModule, FileUploadModule],
  providers: [AiScreeningService],
  exports: [AiScreeningService],
})
export class AiScreeningModule {}
