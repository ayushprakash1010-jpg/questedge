import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOfferTemplateDto } from './dto/create-offer-template.dto';
import { UpdateOfferTemplateDto } from './dto/update-offer-template.dto';

@Injectable()
export class OfferTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, userId: string, dto: CreateOfferTemplateDto) {
    return this.prisma.offerTemplate.create({
      data: {
        orgId,
        createdById: userId,
        name: dto.name,
        body: dto.body,
        variables: (dto.variables ?? []) as any,
        brandingJson: (dto.brandingJson ?? null) as any,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
  }

  async list(orgId: string, opts: { activeOnly?: boolean } = {}) {
    return this.prisma.offerTemplate.findMany({
      where: { orgId, ...(opts.activeOnly ? { isActive: true } : {}) },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      include: { createdBy: { select: { id: true, name: true } } },
    });
  }

  async findOne(orgId: string, id: string) {
    const tpl = await this.prisma.offerTemplate.findFirst({
      where: { id, orgId },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    if (!tpl) throw new NotFoundException('Offer template not found');
    return tpl;
  }

  async update(orgId: string, id: string, dto: UpdateOfferTemplateDto) {
    const tpl = await this.findOne(orgId, id);

    const isContentChange =
      (dto.body !== undefined && dto.body !== tpl.body) ||
      (dto.variables !== undefined);

    return this.prisma.offerTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.variables !== undefined && { variables: dto.variables as any }),
        ...(dto.brandingJson !== undefined && { brandingJson: dto.brandingJson as any }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(isContentChange && { version: { increment: 1 } }),
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
  }

  async deactivate(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.offerTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async preview(orgId: string, id: string, sampleData: Record<string, unknown>) {
    const tpl = await this.findOne(orgId, id);
    if (!tpl) throw new NotFoundException();
    if (!sampleData || typeof sampleData !== 'object') {
      throw new BadRequestException('sampleData must be an object');
    }
    return { name: tpl.name, body: tpl.body, sampleData };
  }
}
