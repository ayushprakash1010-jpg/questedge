import { Module } from '@nestjs/common';
import { DecisionsController } from './decisions.controller';
import { DecisionsService } from './decisions.service';
import { RewardsModule } from '../rewards/rewards.module';

@Module({
  imports: [RewardsModule],
  controllers: [DecisionsController],
  providers: [DecisionsService],
  exports: [DecisionsService],
})
export class DecisionsModule {}
