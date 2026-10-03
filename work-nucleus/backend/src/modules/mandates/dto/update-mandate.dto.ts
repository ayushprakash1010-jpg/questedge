import { PartialType } from '@nestjs/swagger';
import { CreateMandateDto } from './create-mandate.dto';

export class UpdateMandateDto extends PartialType(CreateMandateDto) {}
