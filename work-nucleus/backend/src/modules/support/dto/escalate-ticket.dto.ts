import { IsString, IsEnum } from 'class-validator';
import { EscalationLevel } from '@prisma/client';

export class EscalateTicketDto {
  @IsEnum(EscalationLevel)
  level: string;

  @IsString()
  reason: string;
}
