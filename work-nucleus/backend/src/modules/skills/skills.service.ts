import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchSkillsDto } from './dto/search-skills.dto';
import { CreateSkillDto } from './dto/create-skill.dto';
import { Prisma } from '@prisma/client';
import { DEFAULT_SKILLS } from './default-skills.data';

@Injectable()
export class SkillsService implements OnModuleInit {
  private readonly logger = new Logger(SkillsService.name);
  private catalogChecked = false;
  private seedInFlight: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureDefaultCatalog().catch((err) => {
      this.logger.warn(`Skill catalog check skipped at startup: ${err?.message || err}`);
    });
  }

  /**
   * Ensures fresh deployments have the baseline skills catalog populated without
   * altering any existing rows.
   */
  private async ensureDefaultCatalog(): Promise<void> {
    if (this.catalogChecked) return;
    if (!this.seedInFlight) {
      this.seedInFlight = (async () => {
        const count = await this.prisma.skill.count();
        if (count === 0) {
          await this.prisma.skill.createMany({ data: DEFAULT_SKILLS });
          this.logger.log(`Seeded ${DEFAULT_SKILLS.length} default skills into empty catalog`);
        }
        this.catalogChecked = true;
      })().finally(() => {
        this.seedInFlight = null;
      });
    }
    await this.seedInFlight;
  }

  async search(query: SearchSkillsDto) {
    await this.ensureDefaultCatalog();
    const where: Prisma.SkillWhereInput = {};

    if (query.q) {
      where.name = { contains: query.q, mode: 'insensitive' };
    }
    if (query.category) {
      where.category = query.category;
    }
    if (query.industry) {
      where.OR = [
        { industry: { contains: query.industry, mode: 'insensitive' } },
        { isGlobal: true },
      ];
    }

    return this.prisma.skill.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      take: 100,
    });
  }

  async findAll() {
    await this.ensureDefaultCatalog();
    return this.prisma.skill.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async findOrCreate(dto: CreateSkillDto) {
    const cleanName = dto.name?.trim();
    if (!cleanName) {
      throw new BadRequestException('Skill name is required');
    }

    const existing = await this.prisma.skill.findFirst({
      where: { name: { equals: cleanName, mode: 'insensitive' } },
    });
    if (existing) return existing;

    return this.prisma.skill.create({
      data: {
        name: cleanName,
        category: dto.category,
        industry: dto.industry?.trim() || null,
        isGlobal: dto.isGlobal ?? true,
      },
    });
  }

  async create(dto: CreateSkillDto) {
    return this.findOrCreate(dto);
  }

  async update(id: string, dto: Partial<CreateSkillDto>) {
    const skill = await this.prisma.skill.findUnique({ where: { id } });
    if (!skill) throw new NotFoundException('Skill not found');
    return this.prisma.skill.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const skill = await this.prisma.skill.findUnique({ where: { id } });
    if (!skill) throw new NotFoundException('Skill not found');
    return this.prisma.skill.delete({ where: { id } });
  }
}
