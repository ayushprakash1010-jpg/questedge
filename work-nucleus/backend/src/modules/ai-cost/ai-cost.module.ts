import { Global, Module } from '@nestjs/common';
import { AiCostController } from './ai-cost.controller';
import { AiCostService } from './ai-cost.service';

@Global()
@Module({
  controllers: [AiCostController],
  providers: [AiCostService],
  exports: [AiCostService],
})
export class AiCostModule {}
