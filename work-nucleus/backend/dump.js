const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();
async function main() {
  const profiles = await prisma.candidateProfile.findMany({ select: { id: true, email: true, auth0Sub: true, name: true } });
  const consents = await prisma.candidateConsent.findMany();
  fs.writeFileSync('db-dump.json', JSON.stringify({ profiles, consents }, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
