import { PartialType } from '@nestjs/swagger';
import { CreateCompensationDto } from './create-compensation.dto';

export class UpdateCompensationDto extends PartialType(CreateCompensationDto) {}
