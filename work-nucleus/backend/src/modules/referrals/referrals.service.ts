import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../comms/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReferralDto } from './dto/create-referral.dto';
import { randomBytes, createHash } from 'crypto';
import { OwnershipStatus, ReferralStatus, SourceType, ConsentStatus } from '@prisma/client';

@Injectable()
export class ReferralsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
  ) {}

  async createReferral(recruiterId: string, dto: CreateReferralDto) {
    // 1. Get recruiter profile
    const recruiter = await this.prisma.recruiterProfile.findUnique({
      where: { id: recruiterId },
    });
    if (!recruiter) {
      throw new BadRequestException('Recruiter profile not found');
    }

    // 2. Get mandate
    const mandate = await this.prisma.mandate.findUnique({
      where: { id: dto.mandateId },
      include: { organization: true },
    });
    if (!mandate) {
      throw new BadRequestException('Mandate not found');
    }

    if (!mandate.acceptsReferrals || mandate.status !== 'ACTIVE') {
      throw new BadRequestException('This mandate is not currently accepting referrals');
    }

    // 3. Resolve candidate profile (Unified Identity by SHA-256)
    const emailHash = createHash('sha256').update(dto.candidateEmail.toLowerCase().trim()).digest('hex');
    
    let candidate = await this.prisma.candidateProfile.findUnique({
      where: { emailHash },
    });

    if (!candidate) {
      candidate = await this.prisma.candidateProfile.create({
        data: {
          email: dto.candidateEmail.toLowerCase().trim(),
          emailHash,
          name: dto.candidateName,
          phone: dto.candidatePhone,
        },
      });
    }

    // 4. Check ClaimScope (Ownership Lock)
    const existingClaim = await this.prisma.claimScope.findUnique({
      where: {
        candidateProfileId_mandateId: {
          candidateProfileId: candidate.id,
          mandateId: mandate.id,
        },
      },
    });

    if (existingClaim) {
      if (existingClaim.status === OwnershipStatus.ACTIVE && existingClaim.ownershipExpiresAt > new Date()) {
        throw new ConflictException(
          'This candidate is already locked by another recruiter or direct application for this mandate.'
        );
      }
      // If expired, we could override. For MVP, we'll just throw if any claim exists.
      throw new ConflictException('This candidate has already been submitted for this mandate.');
    }

    // 5. Generate secure consent token
    const token = randomBytes(32).toString('hex');
    const ownershipExpiresAt = new Date();
    ownershipExpiresAt.setDate(ownershipExpiresAt.getDate() + mandate.ownershipPeriodDays);

    // 6. Transaction: Create Referral, Consent, and ClaimScope
    const result = await this.prisma.$transaction(async (tx) => {
      // Create Referral
      const referral = await tx.referral.create({
        data: {
          mandateId: mandate.id,
          recruiterId: recruiter.id,
          candidateProfileId: candidate.id,
          status: ReferralStatus.PENDING_CONSENT,
          recruiterNote: dto.recruiterNote,
          consentToken: token, // Note: storing token here too based on schema
          consentRequestedAt: new Date(),
        },
      });

      // Create Consent Record
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Consent expires in 7 days

      await tx.candidateConsent.create({
        data: {
          referralId: referral.id,
          candidateProfileId: candidate.id,
          status: ConsentStatus.PENDING,
          consentToken: token,
          expiresAt,
        },
      });

      // Create ClaimScope
      await tx.claimScope.create({
        data: {
          candidateProfileId: candidate.id,
          mandateId: mandate.id,
          orgId: mandate.orgId,
          referralId: referral.id,
          sourceType: SourceType.RECRUITER_REFERRAL,
          ownedByRecruiterId: recruiter.id,
          status: OwnershipStatus.ACTIVE,
          ownershipExpiresAt,
        },
      });

      return referral;
    });

    // 7. Dispatch Email
    await this.emailService.sendConsentRequest({
      toEmail: candidate.email,
      candidateName: candidate.name,
      recruiterName: recruiter.name,
      companyName: mandate.organization.name,
      mandateTitle: mandate.title,
      consentToken: token,
    });

    // 8. Create Notification for Candidate (if they are registered)
    if (candidate.auth0Sub) {
      await this.notificationsService.create({
        userId: candidate.auth0Sub,
        orgId: mandate.orgId,
        type: 'CONSENT_REQUESTED',
        title: 'New Referral Request',
        body: `${recruiter.name} has referred you for ${mandate.title} at ${mandate.organization.name}.`,
        entityType: 'REFERRAL',
        entityId: result.id,
        actionUrl: `/candidate/consents`,
      });
    }

    return {
      success: true,
      referralId: result.id,
      message: 'Referral submitted and consent email sent.',
    };
  }

  // Get recruiter's referrals
  async getMyReferrals(recruiterId: string) {
    return this.prisma.referral.findMany({
      where: { recruiterId },
      include: {
        mandate: {
          select: { title: true, organization: { select: { name: true } }, referralRewardAmount: true, currency: true },
        },
        candidateProfile: {
          select: { name: true, email: true, headline: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
