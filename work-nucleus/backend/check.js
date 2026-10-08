const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const profiles = await prisma.candidateProfile.findMany({ select: { id: true, email: true, auth0Sub: true, name: true } });
  console.log(JSON.stringify(profiles, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
