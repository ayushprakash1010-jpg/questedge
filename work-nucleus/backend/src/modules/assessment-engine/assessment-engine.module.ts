import { Module } from '@nestjs/common';
import {
  AssessmentEngineController,
  AssessmentTakeController,
} from './assessment-engine.controller';
import { AssessmentEngineService } from './assessment-engine.service';
import { QuizService } from './quiz/quiz.service';
import { CodingService } from './coding/coding.service';
import { VideoInterviewService } from './video/video-interview.service';

@Module({
  controllers: [AssessmentEngineController, AssessmentTakeController],
  providers: [
    AssessmentEngineService,
    QuizService,
    CodingService,
    VideoInterviewService,
  ],
  exports: [AssessmentEngineService, QuizService, CodingService, VideoInterviewService],
})
export class AssessmentEngineModule {}

