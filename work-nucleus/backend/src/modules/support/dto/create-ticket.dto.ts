import { IsString, IsOptional, IsEnum, IsUUID, IsArray } from 'class-validator';
import { TicketPriority, TicketCategory } from '@prisma/client';

export class CreateTicketDto {
  @IsUUID()
  orgId: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: string;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: string;

  @IsString()
  reportedBy: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}
