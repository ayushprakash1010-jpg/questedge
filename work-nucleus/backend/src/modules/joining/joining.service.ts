import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { JoiningStatus, OfferStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { JobQueueService } from '../job-queue/job-queue.service';
import { CreateChecklistDto } from './dto/checklist.dto';
import { ReviewDocumentDto, SubmitDocumentDto } from './dto/submit-document.dto';

const QUEUE = 'joining.auto-create';

const DEFAULT_CHECKLIST_ITEMS = [
  { key: 'pan', label: 'PAN card', required: true, owner: 'CANDIDATE', docTypes: ['application/pdf', 'image/png', 'image/jpeg'] },
  { key: 'aadhaar', label: 'Aadhaar', required: true, owner: 'CANDIDATE', docTypes: ['application/pdf', 'image/png', 'image/jpeg'] },
  { key: 'bank_proof', label: 'Bank account proof', required: true, owner: 'CANDIDATE', docTypes: ['application/pdf', 'image/png'] },
  { key: 'last_payslip', label: 'Last 3 payslips', required: true, owner: 'CANDIDATE', docTypes: ['application/pdf'] },
  { key: 'experience_letter', label: 'Experience letter', required: true, owner: 'CANDIDATE', docTypes: ['application/pdf'] },
  { key: 'education_certificate', label: 'Education certificate', required: true, owner: 'CANDIDATE', docTypes: ['application/pdf'] },
  { key: 'photo', label: 'Passport photo', required: true, owner: 'CANDIDATE', docTypes: ['image/png', 'image/jpeg'] },
  { key: 'offer_signed', label: 'Signed offer letter (system)', required: true, owner: 'HR' },
];

@Injectable()
export class JoiningService implements OnModuleInit {
  private readonly logger = new Logger(JoiningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: JobQueueService,
  ) {}

  async onModuleInit() {
    await this.queue.ensureQueue(QUEUE);
    await this.queue.registerWorker<{ offerId: string }>(QUEUE, async (jobs) => {
      for (const job of jobs) {
        try {
          await this.autoCreateForOffer(job.data.offerId);
        } catch (err) {
          this.logger.error(`Auto-create joining failed for offer ${job.data.offerId}: ${err}`);
        }
      }
    });
  }

  // ── Checklist CRUD ────────────────────────────────────────────

  async createChecklist(orgId: string, dto: CreateChecklistDto) {
    if (dto.isDefault) {
      await this.prisma.joiningChecklist.updateMany({
        where: { orgId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.joiningChecklist.create({
      data: {
        orgId,
        name: dto.name,
        items: dto.items as any,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async listChecklists(orgId: string) {
    return this.prisma.joiningChecklist.findMany({
      where: { orgId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async ensureDefaultChecklist(orgId: string) {
    const existing = await this.prisma.joiningChecklist.findFirst({ where: { orgId, isDefault: true } });
    if (existing) return existing;
    return this.prisma.joiningChecklist.create({
      data: {
        orgId,
        name: 'Default Onboarding Checklist',
        items: DEFAULT_CHECKLIST_ITEMS as any,
        isDefault: true,
      },
    });
  }

  // ── Auto-create on offer accepted ─────────────────────────────

  async enqueueAutoCreate(offerId: string) {
    await this.queue.enqueue(QUEUE, { offerId });
  }

  async autoCreateForOffer(offerId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { joining: true, application: { include: { candidate: true } } },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.status !== OfferStatus.ACCEPTED) {
      this.logger.debug(`Skipping auto-create: offer ${offerId} status=${offer.status}`);
      return null;
    }
    if (offer.joining) return offer.joining;

    const checklist = await this.ensureDefaultChecklist(offer.orgId);
    const joinDate = new Date();
    joinDate.setDate(joinDate.getDate() + 30);

    return this.prisma.candidateJoining.create({
      data: {
        offerId: offer.id,
        checklistId: checklist.id,
        joinDate,
        status: JoiningStatus.IN_PROGRESS,
        candidateToken: randomBytes(24).toString('hex'),
        submissions: {},
      },
    });
  }

  // ── HR-facing ─────────────────────────────────────────────────

  async listForOrg(orgId: string) {
    return this.prisma.candidateJoining.findMany({
      where: { offer: { orgId } },
      include: {
        offer: {
          include: { application: { include: { candidate: { select: { id: true, name: true, email: true } } } } },
        },
        checklist: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForOrg(orgId: string, joiningId: string) {
    const j = await this.prisma.candidateJoining.findFirst({
      where: { id: joiningId, offer: { orgId } },
      include: {
        offer: { include: { application: { include: { candidate: true, hiringPlan: { select: { designation: true } } } } } },
        checklist: true,
        buddy: { select: { id: true, name: true, email: true } },
        reportingManager: { select: { id: true, name: true, email: true } },
      },
    });
    if (!j) throw new NotFoundException('Joining record not found');
    return j;
  }

  async findByCandidateApp(orgId: string, applicationId: string) {
    return this.prisma.candidateJoining.findFirst({
      where: { offer: { orgId, applicationId } },
      include: { offer: true, checklist: true },
    });
  }

  async setBuddyAndManager(orgId: string, joiningId: string, body: { buddyUserId?: string; reportingMgrId?: string; joinDate?: Date }) {
    await this.findOneForOrg(orgId, joiningId);
    return this.prisma.candidateJoining.update({
      where: { id: joiningId },
      data: {
        ...(body.buddyUserId !== undefined && { buddyUserId: body.buddyUserId }),
        ...(body.reportingMgrId !== undefined && { reportingMgrId: body.reportingMgrId }),
        ...(body.joinDate && { joinDate: body.joinDate }),
      },
    });
  }

  async reviewItem(orgId: string, joiningId: string, dto: ReviewDocumentDto) {
    const j = await this.findOneForOrg(orgId, joiningId);
    const submissions = (j.submissions as Record<string, any>) ?? {};
    const current = submissions[dto.itemKey];
    if (!current) throw new BadRequestException('Item not yet submitted');
    submissions[dto.itemKey] = {
      ...current,
      reviewStatus: dto.decision,
      reviewedAt: new Date().toISOString(),
      reviewerNotes: dto.notes,
    };
    const allDone = this.computeAllDone(j.checklist.items as any[], submissions);
    return this.prisma.candidateJoining.update({
      where: { id: joiningId },
      data: {
        submissions: submissions as any,
        ...(allDone && { status: JoiningStatus.READY_TO_JOIN }),
      },
    });
  }

  // ── Candidate-facing (token) ──────────────────────────────────

  async findByToken(token: string) {
    const j = await this.prisma.candidateJoining.findFirst({
      where: { candidateToken: token },
      include: {
        offer: { include: { organization: { select: { name: true } }, application: { include: { candidate: { select: { name: true, email: true } } } } } },
        checklist: true,
      },
    });
    if (!j) throw new NotFoundException('Joining record not found');
    return j;
  }

  async submitDocument(token: string, dto: SubmitDocumentDto) {
    const j = await this.findByToken(token);
    const items = (j.checklist.items as any[]) ?? [];
    const item = items.find((i) => i.key === dto.itemKey);
    if (!item) throw new BadRequestException('Unknown checklist item');
    if (item.owner !== 'CANDIDATE') throw new BadRequestException('Item is not candidate-owned');

    const submissions = (j.submissions as Record<string, any>) ?? {};
    submissions[dto.itemKey] = {
      status: 'SUBMITTED',
      fileUrl: dto.fileUrl,
      submittedAt: new Date().toISOString(),
      notes: dto.notes,
      reviewStatus: 'PENDING_REVIEW',
    };

    const allSubmitted = items
      .filter((i) => i.owner === 'CANDIDATE' && i.required !== false)
      .every((i) => submissions[i.key]?.status === 'SUBMITTED');

    return this.prisma.candidateJoining.update({
      where: { id: j.id },
      data: {
        submissions: submissions as any,
        ...(allSubmitted && j.status === JoiningStatus.IN_PROGRESS && { status: JoiningStatus.DOCUMENTS_PENDING }),
      },
    });
  }

  private computeAllDone(items: any[], submissions: Record<string, any>): boolean {
    return items
      .filter((i) => i.required !== false)
      .every((i) => {
        const s = submissions[i.key];
        if (!s) return false;
        if (i.owner === 'CANDIDATE') return s.reviewStatus === 'APPROVED';
        return s.status === 'COMPLETED' || s.reviewStatus === 'APPROVED';
      });
  }
}
