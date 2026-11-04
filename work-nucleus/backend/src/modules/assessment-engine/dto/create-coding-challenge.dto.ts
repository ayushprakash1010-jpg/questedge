import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsArray,
  Min,
  MinLength,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Difficulty } from '@prisma/client';

export class CreateCodingChallengeDto {
  @ApiProperty({ example: 'Two Sum' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({
    example:
      'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
  })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiPropertyOptional({ example: '2 <= nums.length <= 10^4' })
  @IsString()
  @IsOptional()
  constraints?: string;

  @ApiProperty({
    example: [
      { id: '1', input: '2 7 11 15\n9', expectedOutput: '0 1', explanation: 'nums[0] + nums[1] = 2 + 7 = 9' },
    ],
  })
  @IsArray()
  sampleTestCases: Array<{
    id: string;
    input: string;
    expectedOutput: string;
    explanation?: string;
  }>;

  @ApiProperty({
    example: [
      { id: 'h1', input: '3 2 4\n6', expectedOutput: '1 2', points: 25 },
      { id: 'h2', input: '3 3\n6', expectedOutput: '0 1', points: 25 },
    ],
  })
  @IsArray()
  hiddenTestCases: Array<{
    id: string;
    input: string;
    expectedOutput: string;
    points: number;
  }>;

  @ApiPropertyOptional({ example: ['python', 'javascript', 'java', 'cpp'] })
  @IsArray()
  @IsOptional()
  supportedLanguages?: string[];

  @ApiPropertyOptional({
    example: { python: 'def two_sum(nums, target):\n    pass', javascript: 'function twoSum(nums, target) {\n}' },
  })
  @IsObject()
  @IsOptional()
  starterCode?: Record<string, string>;

  @ApiPropertyOptional({ enum: Difficulty, default: 'MEDIUM' })
  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty;

  @ApiPropertyOptional({ example: 100 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxScore?: number;

  @ApiPropertyOptional({ example: 5, description: 'Time limit per test case in seconds' })
  @IsInt()
  @Min(1)
  @IsOptional()
  timeLimitSeconds?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @IsOptional()
  orderIndex?: number;
}

