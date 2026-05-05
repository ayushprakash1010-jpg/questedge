import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCompensationDto } from './dto/create-compensation.dto';
import { UpdateCompensationDto } from './dto/update-compensation.dto';

@Injectable()
export class CompensationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, dto: CreateCompensationDto) {
    return this.prisma.compensation.create({
      data: {
        orgId,
        fixedAnnual: dto.fixedAnnual,
        variableAnnual: dto.variableAnnual ?? 0,
        joiningBonus: dto.joiningBonus ?? 0,
        retentionBonus: dto.retentionBonus ?? 0,
        esopUnits: dto.esopUnits ?? 0,
        esopVesting: (dto.esopVesting ?? null) as any,
        breakup: (dto.breakup ?? {}) as any,
        currency: dto.currency ?? 'INR',
      },
    });
  }

  async findOne(orgId: string, id: string) {
    const c = await this.prisma.compensation.findFirst({ where: { id, orgId } });
    if (!c) throw new NotFoundException('Compensation not found');
    return c;
  }

  async update(orgId: string, id: string, dto: UpdateCompensationDto) {
    await this.findOne(orgId, id);
    return this.prisma.compensation.update({
      where: { id },
      data: {
        ...(dto.fixedAnnual !== undefined && { fixedAnnual: dto.fixedAnnual }),
        ...(dto.variableAnnual !== undefined && { variableAnnual: dto.variableAnnual }),
        ...(dto.joiningBonus !== undefined && { joiningBonus: dto.joiningBonus }),
        ...(dto.retentionBonus !== undefined && { retentionBonus: dto.retentionBonus }),
        ...(dto.esopUnits !== undefined && { esopUnits: dto.esopUnits }),
        ...(dto.esopVesting !== undefined && { esopVesting: dto.esopVesting as any }),
        ...(dto.breakup !== undefined && { breakup: dto.breakup as any }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
      },
    });
  }

  /**
   * Compute total CTC and basic India tax-bracket hint range. Hints only — never authoritative.
   */
  computeCtcSummary(comp: {
    fixedAnnual: number;
    variableAnnual: number;
    joiningBonus: number;
    retentionBonus: number;
  }) {
    const annualGross =
      comp.fixedAnnual + comp.variableAnnual + comp.joiningBonus + comp.retentionBonus;
    let bracket = '0%';
    if (annualGross > 1500000) bracket = '30%';
    else if (annualGross > 1200000) bracket = '20%';
    else if (annualGross > 900000) bracket = '15%';
    else if (annualGross > 600000) bracket = '10%';
    else if (annualGross > 300000) bracket = '5%';
    return {
      annualGross,
      indiaSlabHint: bracket,
      disclaimer: 'Tax slab hint only; not a final tax calculation.',
    };
  }
}
