const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.mandate.create({
      data: {
        orgId: "12345678-1234-1234-1234-123456789012",
        title: "Test",
        description: "Test",
        applicationDeadline: new Date(""), // Invalid Date
      }
    });
  } catch (e) {
    console.log("ERROR CONSTRUCTOR:", e.constructor.name);
    console.log("ERROR MESSAGE:", e.message);
  }
}
main();
