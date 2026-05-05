import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthBridgeProvider } from './authbridge.client';
import { OnGridProvider } from './ongrid.client';
import { IDfyProvider } from './idfy.client';
import { IBgvProvider } from './bgv-provider.interface';
import { BgvVendor } from '@prisma/client';

@Injectable()
export class BgvVendorRouter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authbridge: AuthBridgeProvider,
    private readonly ongrid: OnGridProvider,
    private readonly idfy: IDfyProvider,
  ) {}

  async getProviderForOrg(orgId: string): Promise<IBgvProvider> {
    const settings = await this.prisma.orgSettings.findUnique({ where: { orgId } });
    const choice = ((settings?.settings as any)?.bgvProvider ?? 'authbridge')
      .toString()
      .toLowerCase();
    return this.byName(choice);
  }

  byVendor(vendor: BgvVendor): IBgvProvider {
    return this.byName(vendor.toLowerCase());
  }

  byName(name: string): IBgvProvider {
    switch (name.toLowerCase()) {
      case 'ongrid':
        return this.ongrid;
      case 'idfy':
        return this.idfy;
      case 'authbridge':
      default:
        return this.authbridge;
    }
  }
}
