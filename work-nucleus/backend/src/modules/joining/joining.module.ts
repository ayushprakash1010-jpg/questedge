import { Module } from '@nestjs/common';
import { FileUploadModule } from '../file-upload/file-upload.module';
import { JobQueueModule } from '../job-queue/job-queue.module';
import { JoiningController } from './joining.controller';
import { JoiningPublicController } from './joining.public.controller';
import { JoiningService } from './joining.service';

@Module({
  imports: [JobQueueModule, FileUploadModule],
  controllers: [JoiningController, JoiningPublicController],
  providers: [JoiningService],
  exports: [JoiningService],
})
export class JoiningModule {}
