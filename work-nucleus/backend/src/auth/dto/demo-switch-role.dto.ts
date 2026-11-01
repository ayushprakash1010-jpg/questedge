import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum DemoRoleTarget {
  COMPANY = 'COMPANY',
  RECRUITER = 'RECRUITER',
  CANDIDATE = 'CANDIDATE',
}

export class DemoSwitchRoleDto {
  @ApiProperty({
    enum: DemoRoleTarget,
    description: 'Which user-type context to switch into',
    example: DemoRoleTarget.RECRUITER,
  })
  @IsEnum(DemoRoleTarget)
  targetRole: DemoRoleTarget;
}

