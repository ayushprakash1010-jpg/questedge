import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ESignStatus } from '@prisma/client';
import { JobQueueService } from '../../job-queue/job-queue.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { OfferESignService } from './offer-esign.service';

const QUEUE = 'esign.poll';

/**
 * Polls e-sign provider every 30 minutes for SENT/VIEWED requests as a fallback
 * for missed webhooks. Skips PENDING (not yet dispatched) and terminal states.
 */
@Injectable()
export class ESignPollerWorker implements OnModuleInit {
  private readonly logger = new Logger(ESignPollerWorker.name);

  constructor(
    private readonly queue: JobQueueService,
    private readonly prisma: PrismaService,
    private readonly offerESign: OfferESignService,
  ) {}

  async onModuleInit() {
    await this.queue.ensureQueue(QUEUE);
    await this.queue.scheduleCron(QUEUE, '*/30 * * * *', {});
    await this.queue.registerWorker(QUEUE, async () => {
      const open = await this.prisma.eSignRequest.findMany({
        where: { status: { in: [ESignStatus.SENT, ESignStatus.VIEWED] } },
        select: { id: true, offerId: true },
        take: 50,
      });
      for (const r of open) {
        try {
          await this.offerESign.refreshStatus(r.offerId);
        } catch (err) {
          this.logger.warn(`Poll failed for offer ${r.offerId}: ${err}`);
        }
      }
    });
    this.logger.log('eSign poller scheduled (every 30 min)');
  }
}
