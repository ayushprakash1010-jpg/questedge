import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchSkillsDto } from './dto/search-skills.dto';
import { CreateSkillDto } from './dto/create-skill.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: SearchSkillsDto) {
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
    return this.prisma.skill.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateSkillDto) {
    return this.prisma.skill.create({ data: dto });
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
