import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

export interface OfferBodyDraft {
  body: string;
  greeting?: string;
  closing?: string;
}

/**
 * Drafts the free-text body of an offer letter via the AI service's
 * communication_drafter agent (intent=OFFER_LETTER_BODY). Result is cached for
 * 7 days keyed by a stable hash of the input — offer letters are deterministic.
 */
@Injectable()
export class OfferAiService {
  private readonly logger = new Logger(OfferAiService.name);
  private readonly aiServiceUrl: string;
  private readonly internalApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.aiServiceUrl = this.config.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
    this.internalApiKey = this.config.get<string>('INTERNAL_API_KEY', 'dev-internal-key');
  }

  async draftOfferBody(offerId: string, tone = 'warm'): Promise<OfferBodyDraft> {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        organization: true,
        compensation: true,
        application: {
          include: {
            candidate: true,
            hiringPlan: { select: { designation: true, department: true } },
          },
        },
      },
    });
    if (!offer) throw new Error('Offer not found');

    const payload = {
      intent: 'OFFER_LETTER_BODY',
      candidate: {
        name: offer.application.candidate.name,
        email: offer.application.candidate.email,
      },
      role: offer.application.hiringPlan.designation,
      department: offer.application.hiringPlan.department,
      company: offer.organization.name,
      tone,
      compensation: offer.compensation && {
        currency: offer.compensation.currency,
        fixedAnnual: Number(offer.compensation.fixedAnnual),
        variableAnnual: Number(offer.compensation.variableAnnual),
        joiningBonus: Number(offer.compensation.joiningBonus),
      },
      decision: 'SELECTED',
      feedbackTone: 'positive',
    };

    try {
      const rawKey = this.config.get<string>('GEMINI_API_KEY');
      const trimmedKey = rawKey ? rawKey.trim() : null;
      if (!trimmedKey) {
        return this.fallback(offer.application.candidate.name, offer.application.hiringPlan.designation);
      }
      const { GoogleGenAI } = require('@google/genai');
      const ai = new GoogleGenAI({ apiKey: trimmedKey });
      
      const prompt = `Draft a professional ${tone} offer letter body for ${payload.candidate.name} joining as ${payload.role} at ${payload.company}. Return valid JSON with a single "body" field containing the draft. Context: ${JSON.stringify(payload)}`;
      
      const response = await ai.models.generateContent({
        model: this.config.get<string>('GEMINI_MODEL') || 'gemini-1.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json', temperature: 0.7 },
      });
      
      const rawResponse = response.text || "{}";
      const data = JSON.parse(rawResponse.replace(/```json/g, '').replace(/```/g, '').trim());
      const body = typeof data?.body === 'string' ? data.body : '';
      return { body };
    } catch (err) {
      this.logger.error(`AI service call failed: ${err}`);
      return this.fallback(offer.application.candidate.name, offer.application.hiringPlan.designation);
    }
  }

  private fallback(name: string, role: string): OfferBodyDraft {
    return {
      body: `Dear ${name},\n\nWe are delighted to extend an offer for the position of ${role}. We were impressed throughout the interview process and are confident you will make a meaningful contribution to our team.\n\nThis letter outlines the terms of your employment, which are detailed below.`,
    };
  }
}
