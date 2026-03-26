import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MoveCandidateDto {
  @ApiProperty()
  @IsUUID()
  targetStageId: string;
}
