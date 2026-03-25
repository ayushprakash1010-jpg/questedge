import { Module } from '@nestjs/common';
import { HiringPlansController } from './hiring-plans.controller';
import { HiringPlansService } from './hiring-plans.service';

@Module({
  controllers: [HiringPlansController],
  providers: [HiringPlansService],
  exports: [HiringPlansService],
})
export class HiringPlansModule {}
