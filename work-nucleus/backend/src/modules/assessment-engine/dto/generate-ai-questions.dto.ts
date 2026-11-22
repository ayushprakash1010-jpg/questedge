import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsArray,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType, Difficulty } from '@prisma/client';
import { CreateQuestionDto } from './create-question.dto';

export class GenerateAiQuestionsDto {
  @ApiProperty({
    example: 'React Hooks, Next.js Server Components, and TypeScript Generics',
    description: 'The topic, job role, or skills to generate questions for',
  })
  @IsString()
  @MinLength(2)
  topic: string;

  @ApiPropertyOptional({
    example: 5,
    default: 5,
    description: 'Number of questions to draft (1 to 20)',
  })
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  count?: number = 5;

  @ApiPropertyOptional({
    enum: Difficulty,
    default: 'MEDIUM',
    description: 'Difficulty tier (EASY, MEDIUM, HARD)',
  })
  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty = Difficulty.MEDIUM;

  @ApiPropertyOptional({
    enum: QuestionType,
    default: 'MCQ',
    description: 'Question type (MCQ, MULTI_SELECT, TRUE_FALSE)',
  })
  @IsEnum(QuestionType)
  @IsOptional()
  questionType?: QuestionType = QuestionType.MCQ;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    description: 'Default points awarded per question',
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pointsPerQuestion?: number = 10;

  @ApiPropertyOptional({
    example: 'Focus on real-world debugging, common anti-patterns, and architecture',
    description: 'Optional focus area or job description context',
  })
  @IsString()
  @IsOptional()
  context?: string;
}

export class BatchCreateQuestionsDto {
  @ApiProperty({
    description: 'Array of questions to create in batch',
    type: [CreateQuestionDto],
  })
  @IsArray()
  questions: CreateQuestionDto[];
}
