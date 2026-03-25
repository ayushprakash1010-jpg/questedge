import { PrismaClient, SkillCategory } from '@prisma/client';

const prisma = new PrismaClient();

const skills: { name: string; category: SkillCategory; industry?: string; isGlobal: boolean }[] = [
  // TECHNICAL — Software Engineering
  { name: 'JavaScript', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'TypeScript', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'Python', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'Java', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'Go', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'Rust', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'C++', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'React', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'Next.js', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'Angular', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'Vue.js', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'Node.js', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'NestJS', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'Django', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'FastAPI', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'Spring Boot', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'PostgreSQL', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'MongoDB', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'Redis', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'Docker', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'Kubernetes', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'AWS', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'Azure', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'GCP', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'CI/CD', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'GraphQL', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'REST API Design', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'Microservices Architecture', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'System Design', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'Data Structures & Algorithms', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'Machine Learning', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'DevOps', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'Terraform', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'Git', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },
  { name: 'Agile/Scrum', category: 'TECHNICAL', industry: 'Software Engineering', isGlobal: true },

  // TECHNICAL — Finance
  { name: 'Financial Modeling', category: 'TECHNICAL', industry: 'Finance', isGlobal: false },
  { name: 'Risk Assessment', category: 'TECHNICAL', industry: 'Finance', isGlobal: false },
  { name: 'Regulatory Compliance', category: 'TECHNICAL', industry: 'Finance', isGlobal: false },
  { name: 'Bloomberg Terminal', category: 'TECHNICAL', industry: 'Finance', isGlobal: false },
  { name: 'Quantitative Analysis', category: 'TECHNICAL', industry: 'Finance', isGlobal: false },
  { name: 'Portfolio Management', category: 'TECHNICAL', industry: 'Finance', isGlobal: false },
  { name: 'Derivatives Pricing', category: 'TECHNICAL', industry: 'Finance', isGlobal: false },
  { name: 'AML/KYC', category: 'TECHNICAL', industry: 'Finance', isGlobal: false },
  { name: 'Tax Planning', category: 'TECHNICAL', industry: 'Finance', isGlobal: false },
  { name: 'Audit & Assurance', category: 'TECHNICAL', industry: 'Finance', isGlobal: false },

  // TECHNICAL — Healthcare
  { name: 'Clinical Research', category: 'TECHNICAL', industry: 'Healthcare', isGlobal: false },
  { name: 'HIPAA Compliance', category: 'TECHNICAL', industry: 'Healthcare', isGlobal: false },
  { name: 'Electronic Health Records (EHR)', category: 'TECHNICAL', industry: 'Healthcare', isGlobal: false },
  { name: 'Medical Coding (ICD-10)', category: 'TECHNICAL', industry: 'Healthcare', isGlobal: false },
  { name: 'Pharmacovigilance', category: 'TECHNICAL', industry: 'Healthcare', isGlobal: false },
  { name: 'Clinical Trials Management', category: 'TECHNICAL', industry: 'Healthcare', isGlobal: false },
  { name: 'FDA Regulations', category: 'TECHNICAL', industry: 'Healthcare', isGlobal: false },
  { name: 'Patient Safety', category: 'TECHNICAL', industry: 'Healthcare', isGlobal: false },

  // TECHNICAL — Manufacturing
  { name: 'Lean Manufacturing', category: 'TECHNICAL', industry: 'Manufacturing', isGlobal: false },
  { name: 'Six Sigma', category: 'TECHNICAL', industry: 'Manufacturing', isGlobal: false },
  { name: 'Supply Chain Management', category: 'TECHNICAL', industry: 'Manufacturing', isGlobal: false },
  { name: 'Quality Control', category: 'TECHNICAL', industry: 'Manufacturing', isGlobal: false },
  { name: 'CAD/CAM', category: 'TECHNICAL', industry: 'Manufacturing', isGlobal: false },
  { name: 'ISO 9001', category: 'TECHNICAL', industry: 'Manufacturing', isGlobal: false },
  { name: 'Production Planning', category: 'TECHNICAL', industry: 'Manufacturing', isGlobal: false },
  { name: 'ERP Systems (SAP)', category: 'TECHNICAL', industry: 'Manufacturing', isGlobal: false },

  // TECHNICAL — Retail
  { name: 'Merchandising', category: 'TECHNICAL', industry: 'Retail', isGlobal: false },
  { name: 'Inventory Management', category: 'TECHNICAL', industry: 'Retail', isGlobal: false },
  { name: 'Point of Sale Systems', category: 'TECHNICAL', industry: 'Retail', isGlobal: false },
  { name: 'E-Commerce Platforms', category: 'TECHNICAL', industry: 'Retail', isGlobal: false },
  { name: 'Customer Analytics', category: 'TECHNICAL', industry: 'Retail', isGlobal: false },
  { name: 'Visual Merchandising', category: 'TECHNICAL', industry: 'Retail', isGlobal: false },

  // TECHNICAL — Marketing
  { name: 'SEO/SEM', category: 'TECHNICAL', industry: 'Marketing', isGlobal: false },
  { name: 'Google Analytics', category: 'TECHNICAL', industry: 'Marketing', isGlobal: false },
  { name: 'Content Marketing', category: 'TECHNICAL', industry: 'Marketing', isGlobal: false },
  { name: 'Social Media Marketing', category: 'TECHNICAL', industry: 'Marketing', isGlobal: false },
  { name: 'Marketing Automation (HubSpot)', category: 'TECHNICAL', industry: 'Marketing', isGlobal: false },
  { name: 'A/B Testing', category: 'TECHNICAL', industry: 'Marketing', isGlobal: false },
  { name: 'Brand Strategy', category: 'TECHNICAL', industry: 'Marketing', isGlobal: false },
  { name: 'Copywriting', category: 'TECHNICAL', industry: 'Marketing', isGlobal: false },

  // LEADERSHIP (global)
  { name: 'Strategic Thinking', category: 'LEADERSHIP', isGlobal: true },
  { name: 'Team Building', category: 'LEADERSHIP', isGlobal: true },
  { name: 'Decision Making', category: 'LEADERSHIP', isGlobal: true },
  { name: 'Mentoring & Coaching', category: 'LEADERSHIP', isGlobal: true },
  { name: 'Change Management', category: 'LEADERSHIP', isGlobal: true },
  { name: 'Conflict Resolution', category: 'LEADERSHIP', isGlobal: true },
  { name: 'Stakeholder Management', category: 'LEADERSHIP', isGlobal: true },
  { name: 'Vision & Goal Setting', category: 'LEADERSHIP', isGlobal: true },
  { name: 'Delegation', category: 'LEADERSHIP', isGlobal: true },
  { name: 'Executive Presence', category: 'LEADERSHIP', isGlobal: true },
  { name: 'Cross-Functional Collaboration', category: 'LEADERSHIP', isGlobal: true },
  { name: 'Performance Management', category: 'LEADERSHIP', isGlobal: true },

  // BEHAVIOURAL (global)
  { name: 'Problem Solving', category: 'BEHAVIOURAL', isGlobal: true },
  { name: 'Adaptability', category: 'BEHAVIOURAL', isGlobal: true },
  { name: 'Ownership & Accountability', category: 'BEHAVIOURAL', isGlobal: true },
  { name: 'Attention to Detail', category: 'BEHAVIOURAL', isGlobal: true },
  { name: 'Time Management', category: 'BEHAVIOURAL', isGlobal: true },
  { name: 'Critical Thinking', category: 'BEHAVIOURAL', isGlobal: true },
  { name: 'Emotional Intelligence', category: 'BEHAVIOURAL', isGlobal: true },
  { name: 'Resilience', category: 'BEHAVIOURAL', isGlobal: true },
  { name: 'Growth Mindset', category: 'BEHAVIOURAL', isGlobal: true },
  { name: 'Initiative', category: 'BEHAVIOURAL', isGlobal: true },
  { name: 'Integrity & Ethics', category: 'BEHAVIOURAL', isGlobal: true },
  { name: 'Work-Life Balance', category: 'BEHAVIOURAL', isGlobal: true },

  // COMMUNICATION (global)
  { name: 'Written Communication', category: 'COMMUNICATION', isGlobal: true },
  { name: 'Verbal Communication', category: 'COMMUNICATION', isGlobal: true },
  { name: 'Presentation Skills', category: 'COMMUNICATION', isGlobal: true },
  { name: 'Active Listening', category: 'COMMUNICATION', isGlobal: true },
  { name: 'Negotiation', category: 'COMMUNICATION', isGlobal: true },
  { name: 'Persuasion & Influence', category: 'COMMUNICATION', isGlobal: true },
  { name: 'Storytelling', category: 'COMMUNICATION', isGlobal: true },
  { name: 'Technical Writing', category: 'COMMUNICATION', isGlobal: true },
  { name: 'Public Speaking', category: 'COMMUNICATION', isGlobal: true },
  { name: 'Cross-Cultural Communication', category: 'COMMUNICATION', isGlobal: true },

  // DOMAIN (global)
  { name: 'Project Management', category: 'DOMAIN', isGlobal: true },
  { name: 'Product Management', category: 'DOMAIN', isGlobal: true },
  { name: 'Business Analysis', category: 'DOMAIN', isGlobal: true },
  { name: 'Data Analysis', category: 'DOMAIN', isGlobal: true },
  { name: 'UX/UI Design', category: 'DOMAIN', isGlobal: true },
  { name: 'Sales', category: 'DOMAIN', isGlobal: true },
  { name: 'Customer Success', category: 'DOMAIN', isGlobal: true },
  { name: 'Human Resources', category: 'DOMAIN', isGlobal: true },
  { name: 'Operations Management', category: 'DOMAIN', isGlobal: true },
  { name: 'Legal & Contracts', category: 'DOMAIN', isGlobal: true },
];

async function main() {
  console.log('Seeding skills...');

  // Clear existing skills to avoid duplicates on re-seed
  await prisma.hiringPlanSkill.deleteMany();
  await prisma.skill.deleteMany();

  const created = await prisma.skill.createMany({ data: skills });

  console.log(`Seeded ${created.count} skills`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
