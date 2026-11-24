import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { QuickRankDto, RankingCorrectionDto } from './dto/rank-resumes.dto';
import { ResumeRankingService } from './resume-ranking.service';

const HOUR = 60 * 60 * 1000;
const INTERRUPTED = 'This run was interrupted. Start a new run to retry.';

@Injectable()
export class QuickRankingRunsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QuickRankingRunsService.name);
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    private readonly db: PrismaService,
    private readonly ranking: ResumeRankingService,
  ) {}

  onModuleInit() {
    const sweep = async () => {
      try {
        await this.db.quickRankingRun.deleteMany({
          where: { expiresAt: { lte: new Date() } },
        });
        await this.db.quickRankingRun.updateMany({
          where: {
            status: 'PROCESSING',
            createdAt: { lt: new Date(Date.now() - HOUR / 4) },
          },
          data: { status: 'FAILED', message: INTERRUPTED },
        });
      } catch {
        this.logger.warn('Could not clean up expired Quick Rank runs.');
      }
    };
    void sweep();
    this.cleanupTimer = setInterval(() => void sweep(), HOUR / 12);
    this.cleanupTimer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.cleanupTimer);
  }

  async status(orgId: string, userId: string, id: string) {
    if (!orgId || !userId) throw new ForbiddenException();
    const run = await this.db.quickRankingRun.findFirst({
      where: { id, orgId, userId, expiresAt: { gt: new Date() } },
      select: { id: true, status: true, result: true, message: true },
    });
    if (!run)
      throw new NotFoundException('Ranking run unavailable or expired.');
    return run;
  }

  async rank(orgId: string, userId: string, dto: QuickRankDto) {
    if (!orgId || !userId) throw new ForbiddenException();
    const id = dto.clientRunId ?? randomUUID();
    const requestHash = createHash('sha256')
      .update(JSON.stringify(dto))
      .digest('hex');
    try {
      await this.db.quickRankingRun.create({
        data: {
          id,
          orgId,
          userId,
          requestHash,
          expiresAt: new Date(Date.now() + 24 * HOUR),
        },
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      )
        throw error;
      const run = await this.db.quickRankingRun.findFirst({
        where: {
          id,
          orgId,
          userId,
          requestHash,
          expiresAt: { gt: new Date() },
        },
      });
      if (run?.status === 'COMPLETED') return run.result;
      throw new ConflictException(
        run?.status === 'PROCESSING'
          ? 'Ranking is in progress.'
          : 'Start a new ranking run.',
      );
    }
    try {
      const rankings = await this.ranking.quickRank(orgId, {
        ...dto,
        clientRunId: id,
      });
      const result = { ...rankings, runId: id };
      await this.db.quickRankingRun.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          result: result as unknown as Prisma.InputJsonValue,
        },
      });
      return result;
    } catch (error) {
      const message =
        error instanceof HttpException
          ? error.message
          : 'Ranking could not be completed. Please retry.';
      await this.db.quickRankingRun.update({
        where: { id },
        data: { status: 'FAILED', message },
      });
      throw error;
    }
  }

  async recordCorrection(
    orgId: string,
    userId: string,
    dto: RankingCorrectionDto,
  ) {
    if (!orgId || !userId) throw new ForbiddenException();
    const row =
      dto.source === 'QUICK'
        ? (
            (await this.status(orgId, userId, dto.recordId)).result as any
          )?.rankings?.find((r: any) => r.candidateId === dto.candidateId)
        : await this.db.resumeRankingResult.findFirst({
            where: {
              id: dto.recordId,
              candidateId: dto.candidateId,
              session: { orgId, status: 'COMPLETED' },
            },
            select: { scoreBreakdown: true },
          });
    const criteria = Object.values(row?.scoreBreakdown || {}).flatMap(
      (dimension: any) => dimension?.criteria || [],
    );
    const criterion = criteria.find((item) => item.id === dto.requirementId);
    if (!criterion) throw new NotFoundException('The finding is unavailable.');
    await this.db.auditLog.create({
      data: {
        orgId,
        userId,
        action: 'RANKING_FINDING_CORRECTED',
        entityType: dto.source + '_RANKING',
        entityId: dto.recordId,
        changes: {
          candidateId: dto.candidateId,
          requirementId: dto.requirementId,
          original: criterion.finding,
          corrected: dto.finding,
          scorecardId: row.scoreBreakdown._evaluation.scorecardId,
        },
      },
    });
    return { recorded: true };
  }
}
