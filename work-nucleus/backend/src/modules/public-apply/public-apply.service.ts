import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FileUploadService } from '../file-upload/file-upload.service';
import { JobQueueService } from '../job-queue/job-queue.service';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { CandidateSource } from '@prisma/client';

@Injectable()
export class PublicApplyService {
  private readonly logger = new Logger(PublicApplyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileUpload: FileUploadService,
    private readonly queue: JobQueueService,
  ) {}

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
          },
        },
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

    // Enqueue AI resume scoring job (processed by nightly worker or individually)
    await this.queue.enqueue('resume-score-one', {
      applicationId: application.id,
      candidateId: candidate.id,
      hiringPlanId,
      candidateName: dto.name,
      resumeKey,
    }).catch((err) =>
      this.logger.warn(`Failed to enqueue resume scoring: ${err.message}`),
    );

    return {
      message: 'Application submitted successfully',
      applicationId: application.id,
    };
  }
}
