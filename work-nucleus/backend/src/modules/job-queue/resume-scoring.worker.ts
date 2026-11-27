import { Injectable, OnModuleInit, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { FileUploadService } from '../file-upload/file-upload.service';
import { JobQueueService } from './job-queue.service';
import { AiCostService } from '../ai-cost/ai-cost.service';

/**
 * Worker that processes AI resume scoring.
 *
 * Two modes:
 *  1. Nightly cron job ("resume-scoring-nightly") — finds ALL applications
 *     that have a resume but no AI match score yet, and enqueues individual
 *     scoring jobs for each.
 *  2. Individual scoring job ("resume-score-one") — scores a single
 *     application against its hiring plan's JD + skills.
 */
@Injectable()
export class ResumeScoringWorker implements OnModuleInit {
  private readonly logger = new Logger(ResumeScoringWorker.name);
  private readonly aiServiceUrl: string;
  private readonly internalApiKey: string;

  constructor(
    private readonly queue: JobQueueService,
    private readonly prisma: PrismaService,
    private readonly fileUpload: FileUploadService,
    private readonly config: ConfigService,
    @Optional() private readonly aiCost?: AiCostService,
  ) {
    this.aiServiceUrl = this.config.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:8000',
    );
    this.internalApiKey = this.config.get<string>(
      'INTERNAL_API_KEY',
      'dev-internal-key',
    );
  }

  async onModuleInit() {
    // Ensure queues exist before scheduling or registering workers
    await this.queue.ensureQueue('resume-scoring-nightly');
    await this.queue.ensureQueue('resume-score-one');

    // Schedule nightly run at 2 AM
    await this.queue.scheduleCron('resume-scoring-nightly', '0 2 * * *');

    // Register workers
    await this.queue.registerWorker<{ orgId?: string }>(
      'resume-scoring-nightly',
      async (jobs) => {
        const orgIds = Array.from(
          new Set(
            (jobs ?? [])
              .map((job) => job.data?.orgId)
              .filter((id): id is string => Boolean(id)),
          ),
        );
        if (orgIds.length > 0) {
          for (const orgId of orgIds) {
            await this.handleNightlyRun(orgId);
          }
        } else {
          await this.handleNightlyRun();
        }
      },
    );

    await this.queue.registerWorker<ScoreOneData>(
      'resume-score-one',
      async (jobs) => {
        for (const job of jobs) {
          await this.handleScoreOne(job.data);
        }
      },
      { localConcurrency: 3 },
    );
  }

  /**
   * Nightly cron (or tenant-scoped trigger): find unscored applications and enqueue individual jobs.
   */
  private async handleNightlyRun(orgId?: string) {
    this.logger.log(
      `Starting resume scoring run${orgId ? ` for org ${orgId}` : ''}`,
    );

    const unscored = await this.prisma.candidateApplication.findMany({
      where: {
        aiMatchScore: null,
        candidate: {
          resumeUrl: { not: null },
          ...(orgId ? { orgId } : {}),
        },
      },
      select: {
        id: true,
        candidateId: true,
        hiringPlanId: true,
        candidate: { select: { name: true, resumeUrl: true } },
      },
      take: 500, // safety limit per run
    });

    this.logger.log(`Found ${unscored.length} unscored applications`);

    for (const app of unscored) {
      await this.queue.enqueue('resume-score-one', {
        applicationId: app.id,
        candidateId: app.candidateId,
        hiringPlanId: app.hiringPlanId,
        candidateName: app.candidate.name,
        resumeKey: app.candidate.resumeUrl,
      });
    }

    this.logger.log(`Enqueued ${unscored.length} individual scoring jobs`);
  }

  /**
   * Score one application's resume against its JD + skills.
   */
  private async handleScoreOne(data: ScoreOneData) {
    const { applicationId, hiringPlanId, candidateName, resumeKey } = data;

    // Double-check it hasn't been scored since enqueue
    const existing = await this.prisma.candidateApplication.findUnique({
      where: { id: applicationId },
      select: { aiMatchScore: true },
    });
    if (existing?.aiMatchScore !== null) {
      this.logger.log(`Application ${applicationId} already scored, skipping`);
      return;
    }

    // Get JD + skills for this hiring plan
    const plan = await this.prisma.hiringPlan.findUnique({
      where: { id: hiringPlanId },
      include: {
        jobDescriptions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
        skills: { include: { skill: true } },
      },
    });

    if (!plan || !plan.jobDescriptions[0]) {
      this.logger.warn(`No JD found for plan ${hiringPlanId}, skipping`);
      return;
    }

    const jd = plan.jobDescriptions[0];

    // Step 1: Get resume file buffer
    const fileBuffer = await this.fileUpload.getFileBuffer(resumeKey);
    const contentType = resumeKey.endsWith('.pdf')
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    const rawKey = this.config.get<string>('GEMINI_API_KEY');
    const trimmedKey = rawKey ? rawKey.trim() : null;
    if (!trimmedKey) {
      this.logger.warn(
        `Skipping AI resume scoring for ${applicationId}: GEMINI_API_KEY is not configured`,
      );
      return;
    }

    const model =
      this.config.get<string>('GEMINI_MODEL') || 'gemini-flash-latest';
    const startedAtMs = Date.now();
    let timer: NodeJS.Timeout | undefined;
    try {
      const { GoogleGenAI } = require('@google/genai');
      const ai = new GoogleGenAI({ apiKey: trimmedKey });

      const b64 = Buffer.from(fileBuffer).toString('base64');
      const jdText =
        typeof jd.content === 'string'
          ? jd.content
          : JSON.stringify(jd.content ?? {});
      const prompt = `Score this candidate's resume against the Job Description. Return exactly JSON with "matchScore" (number 0-100) and "summary" (string). JD: ${jdText}, Skills: ${JSON.stringify(plan.skills)}`;

      const response = await Promise.race([
        ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { data: b64, mimeType: contentType } },
                { text: prompt },
              ],
            },
          ],
          config: { responseMimeType: 'application/json', temperature: 0.1 },
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Gemini resume scoring timed out after 30s')),
            30_000,
          );
        }),
      ]);

      await this.aiCost?.logGeminiCall({
        orgId: plan.orgId,
        agentName: 'job_queue.resume_score',
        modelUsed: model,
        startedAtMs,
        response,
      });

      const parsed = JSON.parse(
        (response.text || '{}')
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim(),
      );
      const rawScore = Number(parsed.matchScore);
      const matchScore = Number.isFinite(rawScore)
        ? Math.max(0, Math.min(100, Math.round(rawScore)))
        : 0;
      const summary =
        typeof parsed.summary === 'string' ? parsed.summary.trim() : '';

      // Step 4: Update application with score
      await this.prisma.candidateApplication.update({
        where: { id: applicationId },
        data: {
          aiMatchScore: matchScore,
          aiMatchSummary: summary,
        },
      });

      this.logger.log(`Scored application ${applicationId}: ${matchScore}`);
    } catch (err) {
      await this.aiCost?.logGeminiCall({
        orgId: plan.orgId,
        agentName: 'job_queue.resume_score',
        modelUsed: model,
        startedAtMs,
        error: err,
      });
      this.logger.error(`Resume scoring failed for ${applicationId}: ${err}`);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

interface ScoreOneData {
  applicationId: string;
  candidateId: string;
  hiringPlanId: string;
  candidateName: string;
  resumeKey: string;
}
