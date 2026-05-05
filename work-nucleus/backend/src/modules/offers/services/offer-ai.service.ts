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
      const res = await fetch(`${this.aiServiceUrl}/ai/draft-communication`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': this.internalApiKey,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        this.logger.error(`AI service error ${res.status}: ${text}`);
        return this.fallback(offer.application.candidate.name, offer.application.hiringPlan.designation);
      }
      const data: any = await res.json();
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
