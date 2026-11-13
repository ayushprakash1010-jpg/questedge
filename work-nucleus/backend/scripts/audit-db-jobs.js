const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function countJobs() {
  try {
    const total = await prisma.externalJob.count();
    const active = await prisma.externalJob.count({ where: { isActive: true } });
    console.log(`Total jobs in DB: ${total} | Active: ${active}`);

    const bySource = await prisma.externalJob.groupBy({
      by: ['sourceName'],
      _count: { id: true },
      where: { isActive: true }
    });
    console.log('Active jobs by source:', bySource);

    // Fetch the 10 most recently synced jobs
    const sample = await prisma.externalJob.findMany({
      where: { isActive: true },
      orderBy: { postedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        sourceName: true,
        title: true,
        companyName: true,
        applyUrl: true,
        postedAt: true,
        lastSyncedAt: true
      }
    });

    console.log('\n--- 10 MOST RECENT ACTIVE JOBS ---');
    for (const j of sample) {
      console.log(`[${j.sourceName}] ${j.companyName} - "${j.title}"`);
      console.log(`  Apply: ${j.applyUrl}`);
      console.log(`  Posted: ${j.postedAt} | Synced: ${j.lastSyncedAt}`);
    }
  } catch (e) {
    console.error('DB query error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

countJobs();

