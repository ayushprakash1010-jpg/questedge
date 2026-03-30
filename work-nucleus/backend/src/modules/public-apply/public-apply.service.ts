import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { FileUploadService } from '../file-upload/file-upload.service';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { CandidateSource } from '@prisma/client';

@Injectable()
export class PublicApplyService {
  private readonly logger = new Logger(PublicApplyService.name);
  private readonly aiServiceUrl: string;
  private readonly internalApiKey: string;

  constructor(
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

  async getJobBySlug(slug: string) {
    const publishing = await this.prisma.jobPublishing.findUnique({
      where: { publicSlug: slug },
      include: {
        jobDescription: true,
        hiringPlan: {
          include: {
            organization: { select: { id: true, name: true } },
            skills: { include: { skill: true } },
          },
        },
      },
    });

    if (!publishing || publishing.status !== 'PUBLISHED') {
      throw new NotFoundException('Job listing not found or no longer active');
    }

    const jd = publishing.jobDescription;
    const plan = publishing.hiringPlan;
    const content = jd.content as Record<string, unknown>;

    return {
      slug: publishing.publicSlug,
      organization: plan.organization.name,
      title: content.title || plan.title,
      department: plan.department,
      designation: plan.designation,
      summary: content.summary,
      responsibilities: content.responsibilities,
      qualifications: content.qualifications,
      workMode: content.workMode,
      aboutCompany: content.aboutCompany,
      skills: plan.skills.map((s) => ({
        name: s.skill.name,
        category: s.skill.category,
        priority: s.priority,
      })),
    };
  }

  async submitApplication(
    slug: string,
    dto: SubmitApplicationDto,
    file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Resume file is required');
    }

    const publishing = await this.prisma.jobPublishing.findUnique({
      where: { publicSlug: slug },
      include: {
        hiringPlan: {
          include: {
            pipelineStages: { orderBy: { stageOrder: 'asc' }, take: 1 },
            skills: { include: { skill: true } },
          },
        },
        jobDescription: true,
      },
    });

    if (!publishing || publishing.status !== 'PUBLISHED') {
      throw new NotFoundException('Job listing not found or no longer active');
    }

    const { orgId, hiringPlanId } = publishing;

    // Find or create candidate (unique per org + email)
    let candidate = await this.prisma.candidate.findUnique({
      where: { orgId_email: { orgId, email: dto.email } },
    });

    if (candidate) {
      // Check duplicate application
      const existingApp = await this.prisma.candidateApplication.findUnique({
        where: {
          candidateId_hiringPlanId: {
            candidateId: candidate.id,
            hiringPlanId,
          },
        },
      });
      if (existingApp) {
        throw new ConflictException(
          'You have already applied to this position',
        );
      }
    } else {
      candidate = await this.prisma.candidate.create({
        data: {
          orgId,
          name: dto.name,
          email: dto.email,
          phone: dto.phone || null,
          source: CandidateSource.JOB_BOARD,
        },
      });
    }

    // Upload resume
    const resumeKey = await this.fileUpload.uploadResume(file, candidate.id);
    await this.prisma.candidate.update({
      where: { id: candidate.id },
      data: { resumeUrl: resumeKey },
    });

    // Get first pipeline stage
    const firstStage = publishing.hiringPlan.pipelineStages[0] || null;

    // Create application
    const application = await this.prisma.candidateApplication.create({
      data: {
        candidateId: candidate.id,
        hiringPlanId,
        currentStageId: firstStage?.id || null,
        coverLetter: dto.coverLetter || null,
      },
    });

    // Create initial stage history
    if (firstStage) {
      await this.prisma.candidateStageHistory.create({
        data: {
          applicationId: application.id,
          stageId: firstStage.id,
        },
      });
    }

    // Fire-and-forget: AI resume matching
    this.triggerResumeMatch(
      application.id,
      resumeKey,
      publishing.jobDescription,
      publishing.hiringPlan.skills,
      dto.name,
    ).catch((err) =>
      this.logger.warn(`AI resume match failed: ${err.message}`),
    );

    return {
      message: 'Application submitted successfully',
      applicationId: application.id,
    };
  }

  private async triggerResumeMatch(
    applicationId: string,
    resumeKey: string,
    jobDescription: { content: unknown },
    skills: Array<{ skill: { name: string; category: string }; priority: string }>,
    candidateName: string,
  ) {
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
        headers: { 'x-api-key': this.internalApiKey },
        body: formData,
      },
    );

    if (!extractRes.ok) {
      this.logger.warn(`Resume text extraction failed: ${extractRes.status}`);
      return;
    }

    const { text: resumeText } = (await extractRes.json()) as { text: string };

    // Step 3: Match resume via AI service
    const matchRes = await fetch(`${this.aiServiceUrl}/ai/match-resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.internalApiKey,
      },
      body: JSON.stringify({
        jobDescription: jobDescription.content,
        skills: skills.map((s) => ({
          name: s.skill.name,
          category: s.skill.category,
          priority: s.priority,
        })),
        resumeText,
        candidateName,
      }),
    });

    if (!matchRes.ok) {
      this.logger.warn(`Resume matching failed: ${matchRes.status}`);
      return;
    }

    const matchResult = (await matchRes.json()) as {
      matchScore: number;
      summary: string;
    };

    // Step 4: Update application with AI match score
    await this.prisma.candidateApplication.update({
      where: { id: applicationId },
      data: {
        aiMatchScore: matchResult.matchScore,
        aiMatchSummary: matchResult.summary,
      },
    });

    this.logger.log(
      `Resume match complete for application ${applicationId}: score=${matchResult.matchScore}`,
    );
  }
}
