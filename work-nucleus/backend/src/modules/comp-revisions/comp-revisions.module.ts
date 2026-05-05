import { Module } from '@nestjs/common';
import { OffersModule } from '../offers/offers.module';
import { CompAllocatorService } from '../comp-allocator/comp-allocator.service';
import { CompRevisionsController } from './comp-revisions.controller';
import { CompRevisionsService } from './comp-revisions.service';

@Module({
  imports: [OffersModule],
  controllers: [CompRevisionsController],
  providers: [CompRevisionsService, CompAllocatorService],
  exports: [CompRevisionsService, CompAllocatorService],
})
export class CompRevisionsModule {}
