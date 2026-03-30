import { Module } from '@nestjs/common';
import { PublicApplyController } from './public-apply.controller';
import { PublicApplyService } from './public-apply.service';

@Module({
  controllers: [PublicApplyController],
  providers: [PublicApplyService],
})
export class PublicApplyModule {}
