import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.mandate.create({
      data: {
        orgId: undefined as any, // Simulate missing orgId
        title: 'Test',
        description: 'Test',
      } as any,
    });
    console.log("Success:", result.id);
  } catch (error: any) {
    console.log("ERROR CONSTRUCTOR:", error.constructor.name);
    console.log("ERROR MESSAGE:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
