import { Module } from '@nestjs/common';
import {
  AssessmentEngineController,
  AssessmentTakeController,
} from './assessment-engine.controller';
import { AssessmentEngineService } from './assessment-engine.service';
import { QuizService } from './quiz/quiz.service';
import { CodingService } from './coding/coding.service';
import { VideoInterviewService } from './video/video-interview.service';
import { WebRtcSignalingService } from './video/webrtc-signaling.service';
import { AiScreeningModule } from '../ai-screening/ai-screening.module';

@Module({
  imports: [AiScreeningModule],
  controllers: [AssessmentEngineController, AssessmentTakeController],
  providers: [
    AssessmentEngineService,
    QuizService,
    CodingService,
    VideoInterviewService,
    WebRtcSignalingService,
  ],
  exports: [AssessmentEngineService, QuizService, CodingService, VideoInterviewService, WebRtcSignalingService],
})
export class AssessmentEngineModule {}

