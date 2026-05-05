import { Module } from '@nestjs/common';
import { AppraisalCyclesController } from './appraisal-cycles.controller';
import { AppraisalCyclesService } from './appraisal-cycles.service';

@Module({
  controllers: [AppraisalCyclesController],
  providers: [AppraisalCyclesService],
  exports: [AppraisalCyclesService],
})
export class AppraisalCyclesModule {}
