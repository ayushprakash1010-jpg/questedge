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
import { QuestionType, Difficulty } from '@prisma/client';

export class CreateQuestionDto {
  @ApiProperty({ example: 'What is the output of `typeof null`?' })
  @IsString()
  @MinLength(5)
  text: string;

  @ApiProperty({
    example: [
      { id: 'a', text: '"null"', isCorrect: false },
      { id: 'b', text: '"object"', isCorrect: true },
      { id: 'c', text: '"undefined"', isCorrect: false },
      { id: 'd', text: '"string"', isCorrect: false },
    ],
    description: 'Array of options with id, text, and isCorrect flag',
  })
  @IsArray()
  options: Array<{ id: string; text: string; isCorrect: boolean }>;

  @ApiProperty({ enum: QuestionType, example: 'MCQ' })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({ example: 'JavaScript Basics' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ enum: Difficulty, default: 'MEDIUM' })
  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty;

  @ApiPropertyOptional({ example: 'typeof null returns "object" due to a legacy bug in JS' })
  @IsString()
  @IsOptional()
  explanation?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  points?: number;

  @ApiPropertyOptional({ example: ['javascript', 'basics', 'typeof'] })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @IsOptional()
  orderIndex?: number;
}

