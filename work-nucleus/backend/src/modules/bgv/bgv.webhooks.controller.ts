import { BadRequestException, Body, Controller, Headers, Logger, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../auth/decorators/public.decorator';
import { BgvVendorRouter } from '../../integrations/bgv/bgv.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BgvService } from './bgv.service';

@ApiTags('Webhooks (v2)')
@Public()
@Controller('api/v2/webhooks/bgv')
export class BgvWebhooksController {
  private readonly logger = new Logger(BgvWebhooksController.name);

  constructor(
    private readonly router: BgvVendorRouter,
    private readonly service: BgvService,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':provider')
  @ApiOperation({ summary: 'Generic BGV vendor webhook (provider in path: authbridge | ongrid | idfy)' })
  async receive(
    @Param('provider') providerName: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req: Request,
    @Body() body: any,
  ) {
    const provider = this.router.byName(providerName);
    const raw: Buffer = (req as any).rawBody ?? Buffer.from(JSON.stringify(body ?? {}), 'utf-8');
    if (!provider.verifyWebhook(headers, raw)) {
      this.logger.warn(`BGV webhook signature failed (provider=${providerName})`);
      throw new BadRequestException('Invalid signature');
    }
    const event = provider.parseWebhookEvent(body);
    if (!event) return { ok: true, parsed: false };
    const check = await this.prisma.bgvCheck.findFirst({
      where: { vendorRefId: event.vendorCheckRefId },
    });
    if (!check) return { ok: true, matched: false };
    await this.service.applyVendorStatus(check.id, {
      status: event.status,
      finding: event.finding,
      reportUrl: event.reportUrl,
      rawResponse: body,
    });
    return { ok: true, matched: true };
  }
}
