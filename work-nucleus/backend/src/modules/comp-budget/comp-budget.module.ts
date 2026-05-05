import { Module } from '@nestjs/common';
import { CompBudgetController } from './comp-budget.controller';
import { CompBudgetService } from './comp-budget.service';

@Module({
  controllers: [CompBudgetController],
  providers: [CompBudgetService],
  exports: [CompBudgetService],
})
export class CompBudgetModule {}
