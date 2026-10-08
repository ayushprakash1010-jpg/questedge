import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const hiredReferrals = await prisma.referral.findMany({
    where: { status: 'HIRED' },
    include: { mandate: true }
  });

  console.log(`Found ${hiredReferrals.length} HIRED referrals.`);

  for (const ref of hiredReferrals) {
    const existing = await prisma.rewardTracking.findUnique({
      where: { referralId: ref.id }
    });

    if (!existing) {
      console.log(`Creating RewardTracking for referral ${ref.id}`);
      await prisma.rewardTracking.create({
        data: {
          referralId: ref.id,
          recruiterId: ref.recruiterId,
          mandateId: ref.mandateId,
          orgId: ref.mandate.orgId,
          rewardAmount: ref.mandate.referralRewardAmount || 20000,
          currency: ref.mandate.currency || 'INR',
          status: 'PENDING_APPROVAL',
          hiredAt: ref.updatedAt,
          eligibleAt: ref.updatedAt
        }
      });
    } else if (existing.status !== 'PENDING_APPROVAL') {
      console.log(`Updating existing RewardTracking ${existing.id} to PENDING_APPROVAL`);
      await prisma.rewardTracking.update({
        where: { id: existing.id },
        data: { status: 'PENDING_APPROVAL', eligibleAt: new Date(), hiredAt: new Date() }
      });
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
