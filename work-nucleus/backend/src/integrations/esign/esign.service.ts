import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DigioClient } from './digio.client';
import { LeegalityClient } from './leegality.client';
import { IESignProvider } from './esign-provider.interface';

/**
 * Provider router. OrgSettings.settings.eSignProvider drives the choice;
 * defaults to digio. Each provider implements IESignProvider, so callers stay
 * agnostic.
 */
@Injectable()
export class ESignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly digio: DigioClient,
    private readonly leegality: LeegalityClient,
  ) {}

  async getProviderForOrg(orgId: string): Promise<IESignProvider> {
    const settings = await this.prisma.orgSettings.findUnique({ where: { orgId } });
    const choice = ((settings?.settings as any)?.eSignProvider ?? 'digio')
      .toString()
      .toLowerCase();
    return choice === 'leegality' ? this.leegality : this.digio;
  }

  getProviderByName(name: string): IESignProvider {
    return name.toLowerCase() === 'leegality' ? this.leegality : this.digio;
  }
}
