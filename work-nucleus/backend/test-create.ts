import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Create an org
    let org = await prisma.organization.findFirst();
    if (!org) {
        org = await prisma.organization.create({
            data: { name: 'Test Org' }
        });
    }

    const payload = {
      title: 'Senior Full Stack Developer',
      department: 'Engineering',
      description: 'We are seeking a highly skilled...',
      requiredExperience: '4+ years',
      mandatorySkills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'REST APIs', 'Microservices', 'AWS'],
      preferredSkills: ['Docker', 'Redis', 'CI/CD', 'Cloud Deployment'],
      numberOfOpenings: 1,
      location: 'Mumbai',
      workModel: 'Hybrid',
      employmentType: 'Full-time',
      compensationMin: 1500000,
      compensationMax: 2000000,
      currency: 'INR',
      applicationDeadline: '2026-10-07',
      acceptsDirectApply: true,
      acceptsReferrals: true,
      participationType: 'OPEN',
      referralRewardAmount: 50000,
      referralRewardType: 'FIXED',
      ownershipPeriodDays: 180,
      expectedTimeline: '',
      noticePeriodPref: '',
      hiringManagerName: 'RK',
      hiringManagerTitle: 'VP',
      teamDescription: '5 paced team',
    };

    const result = await prisma.mandate.create({
      data: {
        orgId: org.id,
        title: payload.title,
        department: payload.department,
        description: payload.description,
        requiredExperience: payload.requiredExperience,
        mandatorySkills: payload.mandatorySkills ?? [],
        preferredSkills: payload.preferredSkills ?? [],
        numberOfOpenings: payload.numberOfOpenings ?? 1,
        location: payload.location,
        workModel: payload.workModel,
        employmentType: payload.employmentType,
        compensationMin: payload.compensationMin ? payload.compensationMin : undefined,
        compensationMax: payload.compensationMax ? payload.compensationMax : undefined,
        currency: payload.currency ?? 'INR',
        applicationDeadline: payload.applicationDeadline ? new Date(payload.applicationDeadline) : undefined,
        acceptsDirectApply: payload.acceptsDirectApply ?? true,
        acceptsReferrals: payload.acceptsReferrals ?? true,
        participationType: payload.participationType as any,
        referralRewardAmount: payload.referralRewardAmount ? payload.referralRewardAmount : undefined,
        referralRewardType: payload.referralRewardType,
        ownershipPeriodDays: payload.ownershipPeriodDays ?? 180,
        expectedTimeline: payload.expectedTimeline,
        noticePeriodPref: payload.noticePeriodPref,
        hiringManagerName: payload.hiringManagerName,
        hiringManagerTitle: payload.hiringManagerTitle,
        teamDescription: payload.teamDescription,
        status: 'DRAFT',
      },
    });

    console.log("Success:", result.id);
  } catch (error) {
    console.error("Prisma Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
