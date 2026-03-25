import { PartialType } from '@nestjs/swagger';
import { CreateHiringPlanDto } from './create-hiring-plan.dto';

export class UpdateHiringPlanDto extends PartialType(CreateHiringPlanDto) {}
