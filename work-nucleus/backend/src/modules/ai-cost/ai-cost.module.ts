import { Module } from '@nestjs/common';
import { AiCostController } from './ai-cost.controller';
import { AiCostService } from './ai-cost.service';

@Module({
  controllers: [AiCostController],
  providers: [AiCostService],
  exports: [AiCostService],
})
export class AiCostModule {}
