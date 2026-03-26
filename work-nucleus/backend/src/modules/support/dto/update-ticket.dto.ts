import { IsOptional, IsEnum, IsUUID, IsString } from 'class-validator';
import { TicketStatus, TicketPriority, TicketCategory } from '@prisma/client';

export class UpdateTicketDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: string;
}
