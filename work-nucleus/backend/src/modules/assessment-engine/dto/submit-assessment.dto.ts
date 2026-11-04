import { IsString, IsOptional, IsInt, IsUUID, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitQuizResponseDto {
  @ApiProperty({ description: 'Question ID' })
  @IsUUID()
  questionId: string;

  @ApiPropertyOptional({ description: 'Selected option IDs for MCQ/Multi-select' })
  @IsArray()
  @IsOptional()
  selectedOptions?: string[];

  @ApiPropertyOptional({ description: 'Text answer for subjective questions' })
  @IsString()
  @IsOptional()
  textAnswer?: string;

  @ApiPropertyOptional({ description: 'Time taken on this question in milliseconds' })
  @IsInt()
  @IsOptional()
  timeTakenMs?: number;
}

export class SubmitQuizDto {
  @ApiProperty({ type: [SubmitQuizResponseDto] })
  @IsArray()
  responses: SubmitQuizResponseDto[];
}

export class RunCodeDto {
  @ApiProperty({ example: 'print("Hello World")' })
  @IsString()
  sourceCode: string;

  @ApiProperty({ example: 'python' })
  @IsString()
  language: string;

  @ApiProperty({ example: 71, description: 'Judge0 language ID' })
  @IsInt()
  languageId: number;

  @ApiProperty({ description: 'Coding challenge ID' })
  @IsUUID()
  challengeId: string;

  @ApiPropertyOptional({ description: 'Custom stdin input' })
  @IsString()
  @IsOptional()
  stdin?: string;
}

export class SubmitCodeDto extends RunCodeDto {}

export class UpdateAntiCheatDto {
  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  tabSwitchCount?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  fullscreenExits?: number;
}

export class SendAssessmentInviteDto {
  @ApiProperty({ description: 'Candidate profile ID' })
  @IsUUID()
  candidateId: string;

  @ApiPropertyOptional({ description: 'Application ID to link' })
  @IsUUID()
  @IsOptional()
  applicationId?: string;
}

