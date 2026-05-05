import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { DeclineOfferDto, NegotiateOfferDto } from './dto/decline-offer.dto';
import { OffersService } from './offers.service';
import { OfferRenderService } from './services/offer-render.service';

@ApiTags('Public Offer Portal (v2)')
@Public()
@Controller('api/v2/public/offers')
export class OffersPublicController {
  constructor(
    private readonly service: OffersService,
    private readonly render: OfferRenderService,
  ) {}

  @Get(':token')
  @ApiOperation({ summary: 'Fetch offer by candidate token (sanitised view)' })
  get(@Param('token') token: string) {
    return this.service.findByToken(token);
  }

  @Get(':token/document')
  @ApiOperation({ summary: 'Get a signed URL to the latest offer document' })
  async document(@Param('token') token: string) {
    const offer = await this.service.findByToken(token);
    if (!offer.generatedDocUrl) return { url: null };
    return { url: await this.render.signedUrl(offer.generatedDocUrl) };
  }

  @Post(':token/viewed')
  @ApiOperation({ summary: 'Track that the candidate has viewed the offer' })
  viewed(@Param('token') token: string) {
    return this.service.markViewed(token);
  }

  @Post(':token/decline')
  @ApiOperation({ summary: 'Candidate declines the offer with a reason' })
  decline(@Param('token') token: string, @Body() dto: DeclineOfferDto) {
    return this.service.candidateDecline(token, dto.reason, dto.comment);
  }

  @Post(':token/negotiate')
  @ApiOperation({ summary: 'Candidate sends a counter-proposal — HR is notified' })
  negotiate(@Param('token') token: string, @Body() dto: NegotiateOfferDto) {
    return this.service.candidateNegotiate(token, dto.comment, dto.counter);
  }
}
