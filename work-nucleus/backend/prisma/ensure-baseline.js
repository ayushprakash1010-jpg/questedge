const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

/**
 * Ensures an existing database originally synced with `prisma db push`
 * (tables already present, no `_prisma_migrations` table yet) records the
 * non-destructive `0001_baseline` migration once before `prisma migrate deploy` runs.
 */
async function ensureBaseline() {
  const prisma = new PrismaClient();
  try {
    const [row] = await prisma.$queryRawUnsafe(`
      SELECT
        to_regclass('public._prisma_migrations') IS NOT NULL AS has_migrations,
        to_regclass('public.organizations') IS NOT NULL AS has_schema
    `);

    if (!row.has_migrations && row.has_schema) {
      console.log('[ensure-baseline] Existing db-push schema detected without _prisma_migrations; marking 0001_baseline as applied...');
      execSync('npx prisma migrate resolve --applied 0001_baseline', {
        stdio: 'inherit',
      });
    } else {
      console.log(
        `[ensure-baseline] has_migrations=${row.has_migrations}, has_schema=${row.has_schema} (no baseline resolve needed).`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

ensureBaseline().catch((err) => {
  console.error('[ensure-baseline] Failed:', err);
  process.exit(1);
});
