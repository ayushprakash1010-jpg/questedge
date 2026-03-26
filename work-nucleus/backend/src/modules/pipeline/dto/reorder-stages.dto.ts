import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderStagesDto {
  @ApiProperty({ description: 'Ordered array of stage IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  stageIds: string[];
}
