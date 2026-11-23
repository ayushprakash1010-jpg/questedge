import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { randomUUID, createHash } from 'crypto';

@Injectable()
export class VideoInterviewService {
  private readonly logger = new Logger(VideoInterviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ensureDailyRoom(rawName: string, scheduledAt?: Date): Promise<string> {
    const dailyApiKey = process.env.DAILY_API_KEY;
    const dailyDomain = process.env.DAILY_DOMAIN || 'questedge.daily.co';
    const cleanName = rawName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const defaultUrl = `https://${dailyDomain}/${cleanName}`;

    if (!dailyApiKey) {
      return defaultUrl;
    }

    try {
      const getRes = await fetch(`https://api.daily.co/v1/rooms/${cleanName}`, {
        headers: { Authorization: `Bearer ${dailyApiKey}` },
      });
      if (getRes.ok) {
        const data = await getRes.json();
        return data.url || defaultUrl;
      }

      const expTimestamp = scheduledAt
        ? Math.floor(new Date(scheduledAt).getTime() / 1000) + 86400 * 7
        : Math.floor(Date.now() / 1000) + 86400 * 7;

      const createRes = await fetch('https://api.daily.co/v1/rooms', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${dailyApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: cleanName,
          properties: {
            enable_chat: true,
            enable_screenshare: true,
            start_video_off: false,
            start_audio_off: false,
            exp: expTimestamp,
          },
        }),
      });

      if (createRes.ok) {
        const data = await createRes.json();
        this.logger.log(`Created Daily room: ${data.url}`);
        return data.url || defaultUrl;
      } else {
        const errText = await createRes.text();
        this.logger.warn(`Daily room creation status ${createRes.status}: ${errText}`);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to ensure Daily room: ${err.message}`);
    }

    return defaultUrl;
  }

  async schedule(
    orgId: string,
    data: {
      candidateId?: string;
      candidateEmail?: string;
      candidateName?: string;
      applicationId?: string;
      interviewerId: string;
      pipelineStageId?: string;
      mandateId?: string;
      scheduledAt: string;
    },
  ) {
    let candidateId = data.candidateId;
    if (!candidateId && data.candidateEmail) {
      const email = data.candidateEmail.trim().toLowerCase();
      let candidate = await this.prisma.candidateProfile.findFirst({ where: { email } });
      if (!candidate) {
        candidate = await this.prisma.candidateProfile.create({
          data: {
            auth0Sub: `guest_${randomUUID()}`,
            email,
            emailHash: createHash('sha256').update(email).digest('hex'),
            name: data.candidateName || email.split('@')[0],
          },
        });
      }
      candidateId = candidate.id;
    }

    const roomName = `qe_${randomUUID().slice(0, 8)}_${Date.now()}`.toLowerCase();
    const candidateAccessToken = randomUUID();

    // Ensure Daily room is provisioned
    const roomUrl = await this.ensureDailyRoom(roomName, new Date(data.scheduledAt));

    const interview = await this.prisma.videoInterview.create({
      data: {
        orgId,
        roomName,
        candidateId,
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
        mandate: { select: { id: true, title: true } },
      },
    });

    return {
      ...interview,
      roomUrl,
    };
  }

  async findAll(orgId: string, filters?: { mandateId?: string; status?: string }) {
    if (!orgId) return [];
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

    const roomUrl = await this.ensureDailyRoom(interview.roomName, interview.scheduledAt);

    return {
      ...interview,
      roomUrl,
    };
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

    const roomUrl = await this.ensureDailyRoom(interview.roomName, interview.scheduledAt);

    return {
      ...interview,
      roomUrl,
    };
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
      where: { id, orgId, status: { in: ['IN_PROGRESS', 'SCHEDULED'] } },
    });
    if (!interview) throw new BadRequestException('No active or scheduled interview found');

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

