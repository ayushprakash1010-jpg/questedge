/**
 * Seed script: Creates 5 test candidate profiles with rich profile data
 * and links them as referrals to the first mandate in the org.
 * 
 * The AI Resume Ranking feature will rank these candidates using their
 * profile data (skills, education, experience) — no PDF upload needed.
 * 
 * Usage: 
 *   node seed-test-candidates.js
 */
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

const TEST_CANDIDATES = [
  {
    name: 'Priya Sharma',
    email: 'priya.sharma.test@example.com',
    phone: '+919876543210',
    headline: 'Senior Full Stack Developer | React, Node.js, AWS',
    currentCompany: 'TCS',
    currentDesignation: 'Senior Software Engineer',
    experienceYears: 6,
    skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'PostgreSQL', 'Docker', 'GraphQL', 'Next.js', 'NestJS', 'Redis'],
    education: [
      { degree: 'B.Tech Computer Science', university: 'IIT Bombay', year: 2018 }
    ],
    certifications: ['AWS Solutions Architect Associate', 'Google Cloud Professional Developer'],
    projects: [
      { name: 'E-commerce Platform', description: 'Built full-stack e-commerce solution with Next.js, Stripe payments, handling 500+ daily orders' },
      { name: 'Real-time Chat', description: 'WebSocket-based chat application with React and Socket.io, 1000+ concurrent users' }
    ],
    currentLocation: 'Bengaluru',
    noticePeriodDays: 30,
    workModel: 'HYBRID',
  },
  {
    name: 'Rahul Verma',
    email: 'rahul.verma.test@example.com',
    phone: '+919876543211',
    headline: 'Full Stack Developer | Python, React, MongoDB | Team Lead',
    currentCompany: 'Infosys',
    currentDesignation: 'Technology Lead',
    experienceYears: 8,
    skills: ['Python', 'React', 'MongoDB', 'Django', 'REST APIs', 'CI/CD', 'Kubernetes', 'TypeScript', 'FastAPI', 'Elasticsearch'],
    education: [
      { degree: 'M.Tech Software Engineering', university: 'BITS Pilani', year: 2016 },
      { degree: 'B.Tech Computer Science', university: 'VIT Vellore', year: 2014 }
    ],
    certifications: ['Kubernetes Administrator (CKA)', 'AWS DevOps Engineer Professional'],
    projects: [
      { name: 'Fintech Platform', description: 'Led team of 12 engineers building fintech platform processing $2M+ daily transactions' },
      { name: 'ML Fraud Detection', description: 'Developed machine learning pipeline for fraud detection using Python and scikit-learn' }
    ],
    currentLocation: 'Hyderabad',
    noticePeriodDays: 60,
    workModel: 'REMOTE',
  },
  {
    name: 'Ananya Krishnan',
    email: 'ananya.k.test@example.com',
    phone: '+919876543212',
    headline: 'Frontend Developer | React, Vue.js, Design Systems',
    currentCompany: 'Flipkart',
    currentDesignation: 'SDE-2',
    experienceYears: 4,
    skills: ['React', 'Vue.js', 'TypeScript', 'Tailwind CSS', 'Figma', 'Jest', 'Storybook', 'Next.js', 'CSS Modules', 'Webpack'],
    education: [
      { degree: 'B.E. Information Technology', university: 'Anna University', year: 2020 }
    ],
    certifications: [],
    projects: [
      { name: 'Design System Library', description: 'Built Flipkart design system component library used across 15+ internal applications' },
      { name: 'Portfolio Generator', description: 'Open-source React app for creating developer portfolios (500+ GitHub stars)' }
    ],
    currentLocation: 'Bengaluru',
    noticePeriodDays: 30,
    workModel: 'HYBRID',
  },
  {
    name: 'Vikram Singh',
    email: 'vikram.singh.test@example.com',
    phone: '+919876543213',
    headline: 'Technical Architect | Java, Spring Boot, Microservices',
    currentCompany: 'Wipro',
    currentDesignation: 'Technical Architect',
    experienceYears: 10,
    skills: ['Java', 'Spring Boot', 'Microservices', 'Kafka', 'Redis', 'Oracle', 'AWS', 'React', 'Kubernetes', 'Terraform'],
    education: [
      { degree: 'B.Tech Computer Science', university: 'NIT Trichy', year: 2014 }
    ],
    certifications: ['AWS Solutions Architect Professional', 'Oracle Certified Java Professional', 'Spring Professional Certified'],
    projects: [
      { name: 'Banking Platform', description: 'Designed and architected banking platform processing 5M+ daily transactions with 20+ microservices' },
      { name: 'Healthcare Data Platform', description: 'Architected HIPAA-compliant healthcare data platform with event sourcing' }
    ],
    currentLocation: 'Pune',
    noticePeriodDays: 90,
    workModel: 'ONSITE',
  },
  {
    name: 'Sneha Patel',
    email: 'sneha.patel.test@example.com',
    phone: '+919876543214',
    headline: 'Full Stack Developer | MERN Stack | Cloud Native',
    currentCompany: 'Razorpay',
    currentDesignation: 'Software Engineer',
    experienceYears: 3,
    skills: ['React', 'Node.js', 'Express', 'MongoDB', 'AWS Lambda', 'Docker', 'Git', 'JavaScript', 'REST APIs'],
    education: [
      { degree: 'B.Sc Computer Science', university: 'Delhi University', year: 2021 }
    ],
    certifications: [],
    projects: [
      { name: 'Payment Dashboard', description: 'Developing payment dashboard features using React and Node.js at Razorpay' },
      { name: 'Budget Tracker', description: 'React + Node.js app with chart.js for expense visualization (GitHub: 200+ stars)' },
      { name: 'COVID Dashboard', description: 'Real-time data visualization with React and D3.js (hackathon winner)' }
    ],
    currentLocation: 'Bengaluru',
    noticePeriodDays: 15,
    workModel: 'HYBRID',
  },
];

async function seed() {
  console.log('🌱 Starting test data seed...\n');

  // Find the org and mandate
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('❌ No organization found. Create one first.');
    return;
  }
  console.log(`📌 Organization: ${org.name} (${org.id})`);

  const mandate = await prisma.mandate.findFirst({
    where: { orgId: org.id },
  });
  if (!mandate) {
    console.error('❌ No mandate found. Create one first.');
    return;
  }
  console.log(`📌 Mandate: ${mandate.title} (${mandate.id})\n`);

  // Find a recruiter profile to use as the referrer
  let recruiter = await prisma.recruiterProfile.findFirst({
    where: { isActive: true },
  });
  if (!recruiter) {
    console.log('⚠️  No recruiter found. Creating a test recruiter...');
    recruiter = await prisma.recruiterProfile.create({
      data: {
        email: 'test-recruiter@example.com',
        auth0Sub: 'auth0|test-recruiter-' + crypto.randomUUID(),
        name: 'Test Recruiter',
        isVerified: true,
        isActive: true,
      },
    });
  }
  console.log(`📌 Recruiter: ${recruiter.name} (${recruiter.id})\n`);

  const createdReferralIds = [];

  for (const candidate of TEST_CANDIDATES) {
    const emailHash = crypto.createHash('sha256').update(candidate.email).digest('hex');
    
    // Check if profile already exists
    let profile = await prisma.candidateProfile.findUnique({
      where: { email: candidate.email },
    });

    if (profile) {
      console.log(`⏭️  Profile exists: ${candidate.name} (${profile.id})`);
      // Update profile data if needed
      await prisma.candidateProfile.update({
        where: { id: profile.id },
        data: {
          skills: candidate.skills,
          education: candidate.education,
          certifications: candidate.certifications,
          projects: candidate.projects,
          headline: candidate.headline,
          currentCompany: candidate.currentCompany,
          currentDesignation: candidate.currentDesignation,
          experienceYears: candidate.experienceYears,
          currentLocation: candidate.currentLocation,
          noticePeriodDays: candidate.noticePeriodDays,
          workModel: candidate.workModel,
        },
      });
      console.log(`   ✏️  Updated profile data for ${candidate.name}`);
    } else {
      profile = await prisma.candidateProfile.create({
        data: {
          email: candidate.email,
          emailHash,
          phone: candidate.phone,
          phoneHash: crypto.createHash('sha256').update(candidate.phone).digest('hex'),
          name: candidate.name,
          headline: candidate.headline,
          currentCompany: candidate.currentCompany,
          currentDesignation: candidate.currentDesignation,
          experienceYears: candidate.experienceYears,
          skills: candidate.skills,
          education: candidate.education,
          certifications: candidate.certifications,
          projects: candidate.projects,
          currentLocation: candidate.currentLocation,
          noticePeriodDays: candidate.noticePeriodDays,
          workModel: candidate.workModel,
          resumeUrl: null,
        },
      });
      console.log(`✅ Created profile: ${candidate.name} (${profile.id})`);
    }

    // Check if referral already exists for this candidate+mandate
    const existingReferral = await prisma.referral.findFirst({
      where: {
        candidateProfileId: profile.id,
        mandateId: mandate.id,
      },
    });

    if (existingReferral) {
      console.log(`   ⏭️  Referral already exists: ${existingReferral.id.substring(0, 8)}`);
      createdReferralIds.push(existingReferral.id);
    } else {
      const referral = await prisma.referral.create({
        data: {
          mandateId: mandate.id,
          recruiterId: recruiter.id,
          candidateProfileId: profile.id,
          status: 'UNDER_REVIEW',
          consentToken: crypto.randomUUID(),
        },
      });
      console.log(`   ✅ Created referral: ${referral.id.substring(0, 8)}`);
      createdReferralIds.push(referral.id);
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('🎉 Test data seeded successfully!');
  console.log('═══════════════════════════════════════════════════\n');
  console.log('📋 To test AI Resume Ranking:');
  console.log(`   1. Go to mandate: ${mandate.title}`);
  console.log('   2. Click "AI Rank Resumes"');
  console.log('   3. Select the test candidates');
  console.log('   4. Click "Rank Selected"\n');
  console.log('💡 Candidates use profile data (skills, education, etc.) for ranking.');
  console.log('   No PDF upload needed for testing!\n');
  console.log('📌 Candidate Profile IDs for direct ranking:');
  
  const allProfiles = await prisma.candidateProfile.findMany({
    where: { email: { in: TEST_CANDIDATES.map(c => c.email) } },
    select: { id: true, name: true },
  });
  for (const p of allProfiles) {
    console.log(`   ${p.name}: ${p.id}`);
  }
  
  console.log('\n📌 Referral IDs (also usable for ranking):');
  for (let i = 0; i < createdReferralIds.length; i++) {
    console.log(`   ${TEST_CANDIDATES[i].name}: ${createdReferralIds[i]}`);
  }
}

seed().catch(console.error).finally(() => prisma.$disconnect());
