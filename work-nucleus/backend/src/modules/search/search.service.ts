import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(orgId: string, query: string) {
    if (!query || query.length < 2) {
      return { candidates: [], hiringPlans: [], jobDescriptions: [] };
    }

    const [candidates, hiringPlans] = await Promise.all([
      this.prisma.candidate.findMany({
        where: {
          orgId,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          currentRole: true,
          currentCompany: true,
        },
        take: 5,
      }),
      this.prisma.hiringPlan.findMany({
        where: {
          orgId,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { department: { contains: query, mode: 'insensitive' } },
            { designation: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          department: true,
          status: true,
        },
        take: 5,
      }),
    ]);

    return { candidates, hiringPlans };
  }
}
