import { Module } from '@nestjs/common';
import { OfferTemplatesController } from './offer-templates.controller';
import { OfferTemplatesService } from './offer-templates.service';

@Module({
  controllers: [OfferTemplatesController],
  providers: [OfferTemplatesService],
  exports: [OfferTemplatesService],
})
export class OfferTemplatesModule {}
