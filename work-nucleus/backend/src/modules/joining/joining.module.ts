import { Module } from '@nestjs/common';
import { JobQueueModule } from '../job-queue/job-queue.module';
import { JoiningController } from './joining.controller';
import { JoiningPublicController } from './joining.public.controller';
import { JoiningService } from './joining.service';

@Module({
  imports: [JobQueueModule],
  controllers: [JoiningController, JoiningPublicController],
  providers: [JoiningService],
  exports: [JoiningService],
})
export class JoiningModule {}
