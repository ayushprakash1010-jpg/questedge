import { BadRequestException } from '@nestjs/common';
import { SkillCategory } from '@prisma/client';
import { SkillsService } from './skills.service';
import { DEFAULT_SKILLS } from './default-skills.data';

describe('SkillsService', () => {
  const makePrisma = (count = 5) => ({
    skill: {
      count: jest.fn().mockResolvedValue(count),
      createMany: jest.fn().mockResolvedValue({ count: DEFAULT_SKILLS.length }),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => ({ id: 'skill-1', ...data })),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  });

  it('seeds default skills when catalog is empty', async () => {
    const prisma = makePrisma(0);
    const service = new SkillsService(prisma as any);

    await service.search({ q: 'java', industry: 'Software Engineering' });

    expect(prisma.skill.createMany).toHaveBeenCalledWith({ data: DEFAULT_SKILLS });
    expect(prisma.skill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          name: { contains: 'java', mode: 'insensitive' },
          OR: [
            { industry: { contains: 'Software Engineering', mode: 'insensitive' } },
            { isGlobal: true },
          ],
        },
      }),
    );
  });

  it('skips seeding when skills already exist', async () => {
    const prisma = makePrisma(10);
    const service = new SkillsService(prisma as any);

    await service.search({ q: 'java' });
    expect(prisma.skill.createMany).not.toHaveBeenCalled();
  });

  it('reuses existing skill case-insensitively in findOrCreate', async () => {
    const prisma = makePrisma(10);
    const existing = { id: 'existing-id', name: 'Java', category: SkillCategory.TECHNICAL };
    prisma.skill.findFirst.mockResolvedValue(existing);
    const service = new SkillsService(prisma as any);

    const result = await service.findOrCreate({ name: ' java ', category: SkillCategory.TECHNICAL });
    expect(result).toBe(existing);
    expect(prisma.skill.create).not.toHaveBeenCalled();
  });

  it('creates a new global skill when missing and rejects blank names', async () => {
    const prisma = makePrisma(10);
    const service = new SkillsService(prisma as any);

    await expect(
      service.findOrCreate({ name: '   ', category: SkillCategory.TECHNICAL }),
    ).rejects.toThrow(BadRequestException);

    const created = await service.findOrCreate({
      name: 'Fastify',
      category: SkillCategory.TECHNICAL,
      industry: 'Software Engineering',
    });
    expect(created).toMatchObject({
      id: 'skill-1',
      name: 'Fastify',
      category: SkillCategory.TECHNICAL,
      isGlobal: true,
    });
  });
});
