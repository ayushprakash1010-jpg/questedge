import { BadRequestException, Body, Controller, Headers, Logger, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../auth/decorators/public.decorator';
import { ESignService } from '../../integrations/esign/esign.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OfferESignService } from './services/offer-esign.service';

@ApiTags('Webhooks (v2)')
@Public()
@Controller('api/v2/webhooks')
export class OffersWebhooksController {
  private readonly logger = new Logger(OffersWebhooksController.name);

  constructor(
    private readonly esign: ESignService,
    private readonly offerESign: OfferESignService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('digio')
  @ApiOperation({ summary: 'Digio e-sign webhook' })
  async digio(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req: Request,
    @Body() body: any,
  ) {
    const provider = this.esign.getProviderByName('digio');
    const raw: Buffer = (req as any).rawBody ?? Buffer.from(JSON.stringify(body ?? {}), 'utf-8');

    if (!provider.verifyWebhook(headers, raw)) {
      this.logger.warn('Digio webhook signature verification failed');
      throw new BadRequestException('Invalid signature');
    }

    const event = provider.parseWebhookEvent(body);
    if (!event) {
      this.logger.warn(`Unparseable digio webhook: ${JSON.stringify(body).slice(0, 200)}`);
      return { ok: true, parsed: false };
    }

    const req0 = await this.prisma.eSignRequest.findUnique({
      where: { providerReqId: event.providerReqId },
    });
    if (!req0) return { ok: true, matched: false };

    await this.offerESign.applyStatus(req0.id, event.status);
    return { ok: true, matched: true };
  }
}
