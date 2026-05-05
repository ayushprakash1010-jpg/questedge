import { Global, Module } from '@nestjs/common';
import { AuthBridgeProvider } from './authbridge.client';
import { OnGridProvider } from './ongrid.client';
import { IDfyProvider } from './idfy.client';
import { BgvVendorRouter } from './bgv.service';

@Global()
@Module({
  providers: [BgvVendorRouter, AuthBridgeProvider, OnGridProvider, IDfyProvider],
  exports: [BgvVendorRouter, AuthBridgeProvider, OnGridProvider, IDfyProvider],
})
export class BgvIntegrationsModule {}
