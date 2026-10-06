import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeedbackRequestStatus, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DeclinePeerFeedbackDto,
  NominatePeersDto,
  SubmitPeerFeedbackDto,
} from './dto/peer-feedback.dto';

const MIN_RESPONSES_TO_REVEAL_THEMES = 3;

@Injectable()
export class PeerFeedbackService {
  private readonly logger = new Logger(PeerFeedbackService.name);
  private readonly aiServiceUrl: string;
  private readonly internalApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.aiServiceUrl = this.config.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
    this.internalApiKey = this.config.get<string>('INTERNAL_API_KEY', 'dev-internal-key');
  }

  async nominate(orgId: string, userId: string, dto: NominatePeersDto) {
    await this.assertCycleInOrg(orgId, dto.cycleId);
    if (dto.nominations.length > 10) {
      throw new BadRequestException('Cap nominations at 10 per cycle');
    }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const created = await this.prisma.$transaction(
      dto.nominations.map((n) =>
        this.prisma.peerFeedbackRequest.upsert({
          where: {
            cycleId_subjectUserId_reviewerUserId: {
              cycleId: dto.cycleId,
              subjectUserId: dto.subjectUserId,
              reviewerUserId: n.reviewerUserId,
            },
          },
          update: { relationship: n.relationship, isAnonymous: n.isAnonymous ?? true },
          create: {
            cycleId: dto.cycleId,
            subjectUserId: dto.subjectUserId,
            reviewerUserId: n.reviewerUserId,
            requestedById: userId,
            relationship: n.relationship,
            isAnonymous: n.isAnonymous ?? true,
            reviewerToken: randomBytes(24).toString('hex'),
            expiresAt,
          },
        }),
      ),
    );
    return created;
  }

  async listForSubject(orgId: string, cycleId: string, subjectUserId: string) {
    await this.assertCycleInOrg(orgId, cycleId);
    return this.prisma.peerFeedbackRequest.findMany({
      where: { cycleId, subjectUserId },
      include: { reviewer: { select: { id: true, name: true } } },
      orderBy: { requestedAt: 'asc' },
    });
  }

  async listIncomingForReviewer(orgId: string, userId: string) {
    return this.prisma.peerFeedbackRequest.findMany({
      where: { reviewerUserId: userId, cycle: { orgId }, status: FeedbackRequestStatus.REQUESTED },
      include: {
        cycle: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Aggregated themes for the subject's manager-review pane. Returns nothing
   * (sub-threshold) when fewer than 3 responses, to preserve anonymity.
   */
  async aggregatedForManagerReview(orgId: string, cycleId: string, subjectUserId: string) {
    await this.assertCycleInOrg(orgId, cycleId);
    const submitted = await this.prisma.peerFeedbackRequest.findMany({
      where: { cycleId, subjectUserId, status: FeedbackRequestStatus.SUBMITTED },
      select: { id: true, formData: true, isAnonymous: true, relationship: true, submittedAt: true },
    });
    if (submitted.length < MIN_RESPONSES_TO_REVEAL_THEMES) {
      return {
        responseCount: submitted.length,
        thresholdMet: false,
        message: `Need at least ${MIN_RESPONSES_TO_REVEAL_THEMES} responses to surface themes (anonymity guardrail)`,
      };
    }

    const themes = await this.summariseThemes(submitted.map((s) => s.formData));
    return {
      responseCount: submitted.length,
      thresholdMet: true,
      themes,
      relationships: countBy(submitted, (s) => s.relationship),
    };
  }

  /**
   * Token-gated reviewer view. Never exposes other reviewers' content nor the
   * subject's self-assessment.
   */
  async findByToken(token: string) {
    const r = await this.prisma.peerFeedbackRequest.findUnique({
      where: { reviewerToken: token },
      include: {
        cycle: { select: { id: true, name: true, status: true } },
        subject: { select: { id: true, name: true } },
      },
    });
    if (!r) throw new NotFoundException('Feedback request not found');
    return r;
  }

  async submit(token: string, dto: SubmitPeerFeedbackDto) {
    const r = await this.findByToken(token);
    if (r.status !== FeedbackRequestStatus.REQUESTED && r.status !== FeedbackRequestStatus.ACCEPTED) {
      throw new BadRequestException(`Cannot submit (status=${r.status})`);
    }
    if (r.expiresAt && r.expiresAt < new Date()) {
      await this.prisma.peerFeedbackRequest.update({
        where: { id: r.id },
        data: { status: FeedbackRequestStatus.EXPIRED },
      });
      throw new BadRequestException('Feedback request has expired');
    }
    return this.prisma.peerFeedbackRequest.update({
      where: { id: r.id },
      data: {
        status: FeedbackRequestStatus.SUBMITTED,
        submittedAt: new Date(),
        formData: dto.formData as Prisma.InputJsonValue,
      },
    });
  }

  async decline(token: string, dto: DeclinePeerFeedbackDto) {
    const r = await this.findByToken(token);
    if (r.status !== FeedbackRequestStatus.REQUESTED) {
      throw new BadRequestException('Already actioned');
    }
    return this.prisma.peerFeedbackRequest.update({
      where: { id: r.id },
      data: { status: FeedbackRequestStatus.DECLINED, declinedReason: dto.reason },
    });
  }

  // ── helpers ───────────────────────────────────────────────────

  private async assertCycleInOrg(orgId: string, cycleId: string) {
    const c = await this.prisma.appraisalCycle.findFirst({ where: { id: cycleId, orgId }, select: { id: true } });
    if (!c) throw new NotFoundException('Cycle not found');
  }

  private async summariseThemes(forms: any[]): Promise<{ themes: string[]; quotes: string[] }> {
    try {
      const rawKey = this.config.get<string>('GEMINI_API_KEY');
      const trimmedKey = rawKey ? rawKey.trim() : null;
      if (!trimmedKey) throw new Error("No API key");
      
      const { GoogleGenAI } = require('@google/genai');
      const ai = new GoogleGenAI({ apiKey: trimmedKey });
      
      const prompt = `Summarize the following peer feedback responses into key themes and extract a few notable quotes. Return exactly a JSON object with "themes" (array of strings) and "quotes" (array of strings). Responses: ${JSON.stringify(forms)}`;
      const response = await ai.models.generateContent({
        model: this.config.get<string>('GEMINI_MODEL') || 'gemini-3.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json', temperature: 0.2 },
      });
      
      const rawResponse = response.text || "{}";
      const data = JSON.parse(rawResponse.replace(/```json/g, '').replace(/```/g, '').trim());
      return { themes: data.themes ?? [], quotes: data.quotes ?? [] };
    } catch (err) {
      this.logger.warn(`Peer feedback theme AI failed: ${err}; using rule-based`);
      return { themes: extractKeywords(forms), quotes: [] };
    }
  }
}

function countBy<T, K extends string | number>(arr: T[], key: (x: T) => K): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const item of arr) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function extractKeywords(forms: any[]): string[] {
  const text = forms
    .map((f) => Object.values(f).filter((v) => typeof v === 'string').join(' '))
    .join(' ')
    .toLowerCase();
  const tokens = text.match(/\b[a-z]{4,}\b/g) ?? [];
  const counts: Record<string, number> = {};
  for (const t of tokens) counts[t] = (counts[t] ?? 0) + 1;
  return Object.entries(counts)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([t]) => t);
}
