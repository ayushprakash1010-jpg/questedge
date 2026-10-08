import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const referrals = await prisma.referral.findMany({
    include: { mandate: true, candidateProfile: true }
  });

  for (const ref of referrals) {
    console.log(`Referral: ${ref.candidateProfile.name}, Status: ${ref.status}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
