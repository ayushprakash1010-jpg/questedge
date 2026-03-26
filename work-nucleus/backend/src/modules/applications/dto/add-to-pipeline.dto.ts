import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToPipelineDto {
  @ApiProperty()
  @IsUUID()
  candidateId: string;
}
