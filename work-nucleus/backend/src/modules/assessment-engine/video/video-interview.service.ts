import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class VideoInterviewService {
  constructor(private readonly prisma: PrismaService) {}

  async schedule(
    orgId: string,
    data: {
      candidateId?: string;
      applicationId?: string;
      interviewerId: string;
      pipelineStageId?: string;
      mandateId?: string;
      scheduledAt: string;
    },
  ) {
    const roomName = `QE_${randomUUID().slice(0, 8)}_${Date.now()}`;
    const candidateAccessToken = randomUUID();

    return this.prisma.videoInterview.create({
      data: {
        orgId,
        roomName,
        candidateId: data.candidateId,
        applicationId: data.applicationId,
        interviewerId: data.interviewerId,
        pipelineStageId: data.pipelineStageId,
        mandateId: data.mandateId,
        scheduledAt: new Date(data.scheduledAt),
        candidateAccessToken,
      },
      include: {
        candidateProfile: { select: { id: true, name: true, email: true } },
        interviewer: { select: { id: true, name: true, email: true } },
        pipelineStage: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(orgId: string, filters?: { mandateId?: string; status?: string }) {
    return this.prisma.videoInterview.findMany({
      where: {
        orgId,
        ...(filters?.mandateId ? { mandateId: filters.mandateId } : {}),
        ...(filters?.status ? { status: filters.status as any } : {}),
      },
      include: {
        candidateProfile: { select: { id: true, name: true, email: true } },
        interviewer: { select: { id: true, name: true, email: true } },
        pipelineStage: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const interview = await this.prisma.videoInterview.findFirst({
      where: { id, orgId },
      include: {
        candidateProfile: { select: { id: true, name: true, email: true, resumeUrl: true } },
        interviewer: { select: { id: true, name: true, email: true } },
        pipelineStage: { select: { id: true, name: true } },
        application: {
          select: { id: true, aiMatchScore: true, aiMatchSummary: true },
        },
      },
    });
    if (!interview) throw new NotFoundException('Video interview not found');
    return interview;
  }

  async getByToken(token: string) {
    const interview = await this.prisma.videoInterview.findFirst({
      where: { candidateAccessToken: token },
      select: {
        id: true,
        roomName: true,
        scheduledAt: true,
        status: true,
        candidateProfile: { select: { name: true } },
      },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    if (interview.status === 'COMPLETED' || interview.status === 'CANCELLED') {
      throw new BadRequestException('Interview is no longer active');
    }
    return interview;
  }

  async start(id: string, orgId: string) {
    const interview = await this.prisma.videoInterview.findFirst({
      where: { id, orgId },
    });
    if (!interview) throw new NotFoundException('Interview not found');

    return this.prisma.videoInterview.update({
      where: { id },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });
  }

  async end(id: string, orgId: string) {
    const interview = await this.prisma.videoInterview.findFirst({
      where: { id, orgId, status: 'IN_PROGRESS' },
    });
    if (!interview) throw new BadRequestException('No active interview found');

    const durationSeconds = interview.startedAt
      ? Math.round((Date.now() - interview.startedAt.getTime()) / 1000)
      : 0;

    return this.prisma.videoInterview.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
        durationSeconds,
      },
    });
  }

  async submitFeedback(
    id: string,
    orgId: string,
    feedback: {
      technicalScore?: number;
      communicationScore?: number;
      cultureFitScore?: number;
      leadershipScore?: number;
      overallRating?: number;
      recommendation?: string;
      notes?: string;
      strengths?: string;
      weaknesses?: string;
    },
  ) {
    const interview = await this.prisma.videoInterview.findFirst({
      where: { id, orgId },
    });
    if (!interview) throw new NotFoundException('Interview not found');

    return this.prisma.videoInterview.update({
      where: { id },
      data: feedback,
      include: {
        candidateProfile: { select: { id: true, name: true, email: true } },
        interviewer: { select: { id: true, name: true } },
      },
    });
  }

  async cancel(id: string, orgId: string) {
    const interview = await this.prisma.videoInterview.findFirst({
      where: { id, orgId },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    if (interview.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed interview');
    }

    return this.prisma.videoInterview.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}

