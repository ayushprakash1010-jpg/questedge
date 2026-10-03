import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.mandate.deleteMany({
    where: {
      status: 'DRAFT'
    }
  });
  console.log(`Deleted ${result.count} draft mandates.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
