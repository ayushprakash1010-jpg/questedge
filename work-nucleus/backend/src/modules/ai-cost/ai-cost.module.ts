import { Module } from '@nestjs/common';
import { AiCostController, AiCostInternalController } from './ai-cost.controller';
import { AiCostService } from './ai-cost.service';

@Module({
  controllers: [AiCostController, AiCostInternalController],
  providers: [AiCostService],
  exports: [AiCostService],
})
export class AiCostModule {}
