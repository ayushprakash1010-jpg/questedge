import { Module } from '@nestjs/common';
import {
  PeerFeedbackController,
  PeerFeedbackPublicController,
} from './peer-feedback.controller';
import { PeerFeedbackService } from './peer-feedback.service';

@Module({
  controllers: [PeerFeedbackController, PeerFeedbackPublicController],
  providers: [PeerFeedbackService],
  exports: [PeerFeedbackService],
})
export class PeerFeedbackModule {}
