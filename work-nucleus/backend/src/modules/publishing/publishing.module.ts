import { Module } from '@nestjs/common';
import { PublishingController } from './publishing.controller';
import { PublishingService } from './publishing.service';

@Module({
  controllers: [PublishingController],
  providers: [PublishingService],
  exports: [PublishingService],
})
export class PublishingModule {}
