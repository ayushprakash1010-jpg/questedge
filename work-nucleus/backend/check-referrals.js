const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const referrals = await prisma.referral.findMany({
    include: { candidateProfile: true }
  });
  console.log(JSON.stringify(referrals, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
