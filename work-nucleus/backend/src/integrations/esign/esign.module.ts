import { Module, Global } from '@nestjs/common';
import { ESignService } from './esign.service';
import { DigioClient } from './digio.client';
import { LeegalityClient } from './leegality.client';

@Global()
@Module({
  providers: [ESignService, DigioClient, LeegalityClient],
  exports: [ESignService, DigioClient, LeegalityClient],
})
export class ESignModule {}
