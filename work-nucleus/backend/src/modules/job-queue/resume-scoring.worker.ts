import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { FileUploadService } from '../file-upload/file-upload.service';
import { JobQueueService } from './job-queue.service';

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
    await this.queue.registerWorker(
      'resume-scoring-nightly',
      async () => { await this.handleNightlyRun(); },
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
   * Nightly cron: find unscored applications and enqueue individual jobs.
   */
  private async handleNightlyRun() {
    this.logger.log('Starting nightly resume scoring run');

    const unscored = await this.prisma.candidateApplication.findMany({
      where: {
        aiMatchScore: null,
        candidate: { resumeUrl: { not: null } },
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

    // Step 2: Extract text via AI service
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: contentType });
    formData.append(
      'file',
      blob,
      resumeKey.split('/').pop() || 'resume',
    );

    const extractRes = await fetch(
      `${this.aiServiceUrl}/ai/extract-resume-text`,
      {
        method: 'POST',
        headers: { 'X-Internal-API-Key': this.internalApiKey },
        body: formData,
      },
    );

    if (!extractRes.ok) {
      throw new Error(`Resume text extraction failed: ${extractRes.status}`);
    }

    const { text: resumeText } = (await extractRes.json()) as { text: string };

    // Step 3: Match resume via AI service
    const matchRes = await fetch(`${this.aiServiceUrl}/ai/match-resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-API-Key': this.internalApiKey,
      },
      body: JSON.stringify({
        jobDescription: jd.content,
        skills: plan.skills.map((s) => ({
          name: s.skill.name,
          category: s.skill.category,
          priority: s.priority,
        })),
        resumeText,
        candidateName,
      }),
    });

    if (!matchRes.ok) {
      throw new Error(`Resume matching failed: ${matchRes.status}`);
    }

    const matchResult = (await matchRes.json()) as {
      matchScore: number;
      summary: string;
    };

    // Step 4: Update application with score
    await this.prisma.candidateApplication.update({
      where: { id: applicationId },
      data: {
        aiMatchScore: matchResult.matchScore,
        aiMatchSummary: matchResult.summary,
      },
    });

    this.logger.log(
      `Scored application ${applicationId}: ${matchResult.matchScore}`,
    );
  }
}

interface ScoreOneData {
  applicationId: string;
  candidateId: string;
  hiringPlanId: string;
  candidateName: string;
  resumeKey: string;
}
