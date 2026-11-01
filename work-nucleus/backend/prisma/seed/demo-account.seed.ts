/**
 * Demo Account Seed Script
 *
 * Creates (or idempotently updates) a single demo Auth0 account with all 3 profiles:
 *   - Company Admin (users table)
 *   - Recruiter (recruiter_profiles)
 *   - Candidate (candidate_profiles)
 *
 * Usage:
 *   DEMO_AUTH0_SUB=auth0|xxx DEMO_EMAIL=demo@yourdomain.com npx ts-node prisma/seed/demo-account.seed.ts
 *
 * Or add to your package.json scripts and call after deploy on Render.
 */

import { PrismaClient, Role, UserType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDemoAccount() {
  const DEMO_AUTH0_SUB = process.env.DEMO_AUTH0_SUB;
  const DEMO_EMAIL = process.env.DEMO_EMAIL;
  const DEMO_NAME = process.env.DEMO_NAME ?? 'Demo User';
  const DEMO_ORG_NAME = process.env.DEMO_ORG_NAME ?? 'QuestEdge Demo Corp';

  if (!DEMO_AUTH0_SUB || !DEMO_EMAIL) {
    console.error(
      '❌  DEMO_AUTH0_SUB and DEMO_EMAIL environment variables are required.',
    );
    process.exit(1);
  }

  const domain = DEMO_EMAIL.split('@')[1] ?? 'demo.questedge.com';
  const localPart = DEMO_EMAIL.split('@')[0];
  const recruiterEmail = `${localPart}+recruiter@${domain}`;
  const candidateEmail = `${localPart}+candidate@${domain}`;
  const candidateEmailHash = Buffer.from(candidateEmail).toString('base64');

  console.log(`\n🚀  Seeding demo account for: ${DEMO_EMAIL}`);
  console.log(`    Auth0 Sub : ${DEMO_AUTH0_SUB}`);

  await prisma.$transaction(async (tx) => {
    // ── 1. Ensure demo organisation exists ──────────────────────────────
    let org = await tx.organization.findFirst({
      where: { name: DEMO_ORG_NAME },
    });

    if (!org) {
      org = await tx.organization.create({
        data: { name: DEMO_ORG_NAME, industry: 'Technology' },
      });
      console.log(`    ✅  Created organisation: "${org.name}" (${org.id})`);
    } else {
      console.log(`    ♻️   Organisation already exists: "${org.name}" (${org.id})`);
    }

    // ── 2. Upsert Company Admin user ─────────────────────────────────────
    const companyUser = await tx.user.upsert({
      where: { auth0Sub: DEMO_AUTH0_SUB },
      create: {
        orgId: org.id,
        email: DEMO_EMAIL,
        auth0Sub: DEMO_AUTH0_SUB,
        name: DEMO_NAME,
        role: Role.ADMIN,
        userType: UserType.COMPANY_ADMIN,
        isDemoAccount: true,
        isActive: true,
      },
      update: {
        isDemoAccount: true,
        isActive: true,
        name: DEMO_NAME,
      },
    });
    console.log(`    ✅  Company user upserted: ${companyUser.email} (${companyUser.id})`);

    // ── 3. Upsert Recruiter profile ───────────────────────────────────────
    const recruiter = await tx.recruiterProfile.upsert({
      where: { auth0Sub: DEMO_AUTH0_SUB },
      create: {
        auth0Sub: DEMO_AUTH0_SUB,
        email: recruiterEmail,
        name: `${DEMO_NAME} (Recruiter)`,
        headline: 'Demo Recruiter — Technical Talent Acquisition',
        experienceYears: 5,
        specializations: ['Software Engineering', 'Product Management'],
        isVerified: true,
        verifiedAt: new Date(),
        isDemoAccount: true,
        isActive: true,
      },
      update: {
        isDemoAccount: true,
        isActive: true,
        isVerified: true,
      },
    });
    console.log(`    ✅  Recruiter profile upserted: ${recruiter.email} (${recruiter.id})`);

    // ── 4. Upsert Candidate profile ───────────────────────────────────────
    const candidate = await tx.candidateProfile.upsert({
      where: { auth0Sub: DEMO_AUTH0_SUB },
      create: {
        auth0Sub: DEMO_AUTH0_SUB,
        email: candidateEmail,
        emailHash: candidateEmailHash,
        name: `${DEMO_NAME} (Candidate)`,
        headline: 'Demo Candidate — Full-Stack Software Engineer',
        experienceYears: 4,
        currentCompany: 'Previous Corp Pvt Ltd',
        currentDesignation: 'Software Engineer',
        skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'NestJS'],
        preferredRoles: ['Senior Software Engineer', 'Tech Lead'],
        preferredLocations: ['Bangalore', 'Remote'],
        isProfileComplete: true,
        isDemoAccount: true,
        isActive: true,
      },
      update: {
        isDemoAccount: true,
        isActive: true,
        isProfileComplete: true,
      },
    });
    console.log(`    ✅  Candidate profile upserted: ${candidate.email} (${candidate.id})`);
  });

  console.log('\n🎉  Demo account seed complete!\n');
  console.log('    Next steps:');
  console.log('    1. Log in via Auth0 with this account once to generate a JWT.');
  console.log('    2. Call POST /api/v1/auth/demo/provision with the JWT (or use seed above directly).');
  console.log('    3. Use X-Demo-Role: COMPANY | RECRUITER | CANDIDATE header to switch contexts.\n');
}

seedDemoAccount()
  .catch((e) => {
    console.error('❌  Demo seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

