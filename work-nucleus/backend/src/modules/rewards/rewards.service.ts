import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RewardStatus } from '@prisma/client';

@Injectable()
export class RewardsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Called when an application is moved to SELECTED / Hired.
   * If there is a referral, it triggers reward eligibility.
   */
  async triggerRewardEligibility(referralId: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { id: referralId },
      include: { mandate: true },
    });

    if (!referral) return null;

    const existing = await this.prisma.rewardTracking.findUnique({
      where: { referralId },
    });

    if (existing) {
      if (existing.status === 'POTENTIAL') {
        return this.prisma.rewardTracking.update({
          where: { id: existing.id },
          data: {
            status: RewardStatus.PENDING_APPROVAL,
            eligibleAt: new Date(),
            hiredAt: new Date(),
          },
        });
      }
      return existing; // Already triggered
    }

    // Create the reward tracking record as PENDING_APPROVAL
    return this.prisma.rewardTracking.create({
      data: {
        referralId: referral.id,
        mandateId: referral.mandateId,
        recruiterId: referral.recruiterId,
        orgId: referral.mandate.orgId,
        status: RewardStatus.PENDING_APPROVAL, // Goes straight to company approval
        rewardAmount: referral.mandate.referralRewardAmount || 0,
        currency: referral.mandate.currency || 'INR',
        eligibleAt: new Date(),
        hiredAt: new Date(),
      },
    });
  }

  /**
   * Company Dashboard: Get all rewards for their mandates
   */
  async getCompanyRewards(orgId: string) {
    return this.prisma.rewardTracking.findMany({
      where: { orgId },
      include: {
        recruiter: { select: { name: true, email: true } },
        referral: {
          select: {
            candidateProfile: { select: { name: true, email: true } },
            mandate: { select: { title: true } }
          }
        }
      },
      orderBy: { eligibleAt: 'desc' },
    });
  }

  /**
   * Recruiter Dashboard: Get earnings and potentials
   */
  async getRecruiterRewards(auth0Sub: string) {
    const recruiter = await this.prisma.recruiterProfile.findUnique({
      where: { auth0Sub },
    });
    if (!recruiter) throw new NotFoundException('Recruiter not found');

    const rewards = await this.prisma.rewardTracking.findMany({
      where: { recruiterId: recruiter.id },
      include: {
        referral: {
          select: {
            candidateProfile: { select: { name: true } },
            mandate: { select: { title: true, organization: { select: { name: true } } } }
          }
        }
      },
      orderBy: { eligibleAt: 'desc' },
    });

    // We can also fetch the "Pipeline Potential" (active referrals not yet hired)
    const pipeline = await this.prisma.referral.findMany({
      where: {
        recruiterId: recruiter.id,
        status: { notIn: ['ACTIVATED', 'WITHDRAWN', 'CANDIDATE_DECLINED'] },
        reward: null, // No reward generated yet
      },
      include: {
        mandate: { select: { referralRewardAmount: true, currency: true } },
      },
    });

    return {
      rewards,
      pipelinePotential: pipeline.reduce((sum, ref) => sum + Number(ref.mandate.referralRewardAmount || 0), 0),
    };
  }

  /**
   * Company action to approve the payout
   */
  async approveReward(orgId: string, rewardId: string) {
    const reward = await this.prisma.rewardTracking.findUnique({
      where: { id: rewardId },
    });

    if (!reward) throw new NotFoundException('Reward not found');
    if (reward.orgId !== orgId) throw new BadRequestException('Unauthorized');
    if (reward.status !== RewardStatus.PENDING_APPROVAL && reward.status !== RewardStatus.ELIGIBLE) {
      throw new BadRequestException('Reward is not pending approval');
    }

    return this.prisma.rewardTracking.update({
      where: { id: rewardId },
      data: {
        status: RewardStatus.APPROVED,
        approvedAt: new Date(),
      },
    });
  }
}
