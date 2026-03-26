// =============================================================
// Mock Data for Work Nucleus — used when NEXT_PUBLIC_USE_MOCK_DATA=true
// =============================================================

// ── Fixed IDs ──────────────────────────────────────────────────
const ORG_ID = "org-001";

export const USERS = [
  { id: "usr-001", email: "admin@acme.com", name: "Priya Sharma", role: "ADMIN", isActive: true, createdAt: "2025-12-01T10:00:00Z", auth0Sub: "auth0|mock-001" },
  { id: "usr-002", email: "hr@acme.com", name: "Rahul Mehta", role: "HR", isActive: true, createdAt: "2025-12-02T10:00:00Z", auth0Sub: "auth0|mock-002" },
  { id: "usr-003", email: "eng-mgr@acme.com", name: "Anita Desai", role: "HIRING_MANAGER", isActive: true, createdAt: "2025-12-03T10:00:00Z", auth0Sub: "auth0|mock-003" },
  { id: "usr-004", email: "product-mgr@acme.com", name: "Vikram Joshi", role: "HIRING_MANAGER", isActive: true, createdAt: "2025-12-04T10:00:00Z", auth0Sub: "auth0|mock-004" },
  { id: "usr-005", email: "interviewer@acme.com", name: "Sneha Patel", role: "INTERVIEWER", isActive: true, createdAt: "2025-12-05T10:00:00Z", auth0Sub: "auth0|mock-005" },
  { id: "usr-006", email: "viewer@acme.com", name: "Karan Singh", role: "VIEWER", isActive: true, createdAt: "2025-12-06T10:00:00Z", auth0Sub: "auth0|mock-006" },
  { id: "usr-007", email: "old-user@acme.com", name: "Neha Kapoor", role: "INTERVIEWER", isActive: false, createdAt: "2025-11-15T10:00:00Z", auth0Sub: "auth0|mock-007" },
];

export const CURRENT_USER = USERS[0]; // admin by default

export const ORGANIZATION = {
  id: ORG_ID,
  name: "Acme Technologies",
  industry: "Technology",
};

export const PROFILE = {
  isProvisioned: true,
  id: CURRENT_USER.id,
  email: CURRENT_USER.email,
  name: CURRENT_USER.name,
  role: CURRENT_USER.role,
  avatarUrl: null,
  organization: ORGANIZATION,
};

// ── Skills ─────────────────────────────────────────────────────
export const SKILLS = [
  { id: "sk-001", name: "React", category: "TECHNICAL" },
  { id: "sk-002", name: "TypeScript", category: "TECHNICAL" },
  { id: "sk-003", name: "Node.js", category: "TECHNICAL" },
  { id: "sk-004", name: "Python", category: "TECHNICAL" },
  { id: "sk-005", name: "AWS", category: "TECHNICAL" },
  { id: "sk-006", name: "System Design", category: "TECHNICAL" },
  { id: "sk-007", name: "Team Leadership", category: "LEADERSHIP" },
  { id: "sk-008", name: "Strategic Thinking", category: "LEADERSHIP" },
  { id: "sk-009", name: "Communication", category: "COMMUNICATION" },
  { id: "sk-010", name: "Problem Solving", category: "BEHAVIOURAL" },
  { id: "sk-011", name: "Collaboration", category: "BEHAVIOURAL" },
  { id: "sk-012", name: "Product Management", category: "DOMAIN" },
  { id: "sk-013", name: "Data Analysis", category: "TECHNICAL" },
  { id: "sk-014", name: "SQL", category: "TECHNICAL" },
  { id: "sk-015", name: "Docker", category: "TECHNICAL" },
  { id: "sk-016", name: "Kubernetes", category: "TECHNICAL" },
];

// ── Hiring Plans ───────────────────────────────────────────────
export const HIRING_PLANS = [
  {
    id: "hp-001",
    title: "Senior Frontend Engineer",
    industry: "Technology",
    department: "Engineering",
    quarter: 1,
    year: 2026,
    totalRoles: 3,
    filledRoles: 1,
    status: "ACTIVE",
    budgetMin: "2500000",
    budgetMax: "4000000",
    currency: "INR",
    designation: "Senior Software Engineer",
    benefits: ["Health Insurance", "Stock Options", "Remote Work", "Learning Budget"],
    reportingManagerName: "Anita Desai",
    hodName: "CTO",
    teamSize: 12,
    teamLevels: "L4-L6",
    notes: "Urgent hire — frontend team scaling for new product launch.",
    hiringManager: { id: "usr-003", name: "Anita Desai", email: "eng-mgr@acme.com" },
    createdBy: { id: "usr-002", name: "Rahul Mehta" },
    organization: ORGANIZATION,
    skills: [
      { id: "hps-001", skill: SKILLS[0], priority: "MUST_HAVE", minProficiency: 4 },
      { id: "hps-002", skill: SKILLS[1], priority: "MUST_HAVE", minProficiency: 4 },
      { id: "hps-003", skill: SKILLS[2], priority: "NICE_TO_HAVE", minProficiency: 3 },
      { id: "hps-004", skill: SKILLS[5], priority: "MUST_HAVE", minProficiency: 3 },
      { id: "hps-005", skill: SKILLS[8], priority: "NICE_TO_HAVE", minProficiency: 3 },
    ],
    createdAt: "2025-12-15T10:00:00Z",
    updatedAt: "2026-01-10T14:30:00Z",
  },
  {
    id: "hp-002",
    title: "Product Manager — Growth",
    industry: "Technology",
    department: "Product",
    quarter: 1,
    year: 2026,
    totalRoles: 2,
    filledRoles: 0,
    status: "ACTIVE",
    budgetMin: "3000000",
    budgetMax: "5000000",
    currency: "INR",
    designation: "Senior Product Manager",
    benefits: ["Health Insurance", "Stock Options", "Flexible Hours"],
    reportingManagerName: "Vikram Joshi",
    hodName: "VP Product",
    teamSize: 6,
    teamLevels: "L5-L6",
    notes: null,
    hiringManager: { id: "usr-004", name: "Vikram Joshi", email: "product-mgr@acme.com" },
    createdBy: { id: "usr-002", name: "Rahul Mehta" },
    organization: ORGANIZATION,
    skills: [
      { id: "hps-010", skill: SKILLS[11], priority: "MUST_HAVE", minProficiency: 4 },
      { id: "hps-011", skill: SKILLS[7], priority: "MUST_HAVE", minProficiency: 3 },
      { id: "hps-012", skill: SKILLS[8], priority: "MUST_HAVE", minProficiency: 4 },
      { id: "hps-013", skill: SKILLS[12], priority: "NICE_TO_HAVE", minProficiency: 3 },
    ],
    createdAt: "2026-01-05T10:00:00Z",
    updatedAt: "2026-01-20T11:00:00Z",
  },
  {
    id: "hp-003",
    title: "DevOps Engineer",
    industry: "Technology",
    department: "Engineering",
    quarter: 2,
    year: 2026,
    totalRoles: 1,
    filledRoles: 0,
    status: "DRAFT",
    budgetMin: "2000000",
    budgetMax: "3500000",
    currency: "INR",
    designation: "DevOps Engineer",
    benefits: ["Health Insurance", "Remote Work"],
    reportingManagerName: "Anita Desai",
    hodName: "CTO",
    teamSize: 5,
    teamLevels: "L3-L5",
    notes: "Planned for Q2. Pending budget approval.",
    hiringManager: { id: "usr-003", name: "Anita Desai", email: "eng-mgr@acme.com" },
    createdBy: { id: "usr-001", name: "Priya Sharma" },
    organization: ORGANIZATION,
    skills: [
      { id: "hps-020", skill: SKILLS[4], priority: "MUST_HAVE", minProficiency: 4 },
      { id: "hps-021", skill: SKILLS[14], priority: "MUST_HAVE", minProficiency: 4 },
      { id: "hps-022", skill: SKILLS[15], priority: "MUST_HAVE", minProficiency: 3 },
      { id: "hps-023", skill: SKILLS[3], priority: "NICE_TO_HAVE", minProficiency: 3 },
    ],
    createdAt: "2026-02-01T10:00:00Z",
    updatedAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "hp-004",
    title: "Data Analyst",
    industry: "Technology",
    department: "Analytics",
    quarter: 4,
    year: 2025,
    totalRoles: 2,
    filledRoles: 2,
    status: "COMPLETED",
    budgetMin: "1500000",
    budgetMax: "2500000",
    currency: "INR",
    designation: "Data Analyst",
    benefits: ["Health Insurance", "Learning Budget"],
    reportingManagerName: "Vikram Joshi",
    hodName: "VP Data",
    teamSize: 4,
    teamLevels: "L3-L4",
    notes: "Both positions filled successfully.",
    hiringManager: { id: "usr-004", name: "Vikram Joshi", email: "product-mgr@acme.com" },
    createdBy: { id: "usr-002", name: "Rahul Mehta" },
    organization: ORGANIZATION,
    skills: [
      { id: "hps-030", skill: SKILLS[12], priority: "MUST_HAVE", minProficiency: 4 },
      { id: "hps-031", skill: SKILLS[13], priority: "MUST_HAVE", minProficiency: 4 },
      { id: "hps-032", skill: SKILLS[3], priority: "NICE_TO_HAVE", minProficiency: 3 },
    ],
    createdAt: "2025-09-01T10:00:00Z",
    updatedAt: "2025-12-20T16:00:00Z",
  },
];

// ── Pipeline Stages (per hiring plan) ──────────────────────────
function makeStages(planId: string) {
  const base = [
    { name: "Resume Screening", stageType: "SCREENING", stageOrder: 1, maxDurationDays: 3, description: "Initial resume & profile review", skillsToEvaluate: [] },
    { name: "Phone Screen", stageType: "SCREENING", stageOrder: 2, maxDurationDays: 5, description: "30-min introductory call", skillsToEvaluate: ["Communication"] },
    { name: "Technical Round", stageType: "TECHNICAL", stageOrder: 3, maxDurationDays: 7, description: "Coding + system design interview", skillsToEvaluate: ["React", "TypeScript", "System Design"] },
    { name: "HR Round", stageType: "HR", stageOrder: 4, maxDurationDays: 5, description: "Culture fit & expectations discussion", skillsToEvaluate: ["Communication", "Collaboration"] },
    { name: "Leadership Round", stageType: "LEADERSHIP", stageOrder: 5, maxDurationDays: 7, description: "Bar raiser / VP interview", skillsToEvaluate: ["Team Leadership", "Strategic Thinking"] },
    { name: "Offer", stageType: "OFFER", stageOrder: 6, maxDurationDays: 10, description: "Offer negotiation & rollout", skillsToEvaluate: [] },
  ];
  return base.map((s, i) => ({
    id: `stg-${planId}-${i + 1}`,
    hiringPlanId: planId,
    ...s,
    interviewers: i >= 2 && i <= 4
      ? [{ id: `si-${planId}-${i}-1`, user: { id: "usr-005", name: "Sneha Patel", email: "interviewer@acme.com" }, isMandatory: true }]
      : [],
    _count: { applications: 0 },
  }));
}

export const STAGES: Record<string, ReturnType<typeof makeStages>> = {
  "hp-001": makeStages("hp-001"),
  "hp-002": makeStages("hp-002"),
  "hp-003": makeStages("hp-003"),
  "hp-004": makeStages("hp-004"),
};

// ── Candidates ─────────────────────────────────────────────────
export const CANDIDATES = [
  { id: "cand-001", name: "Arjun Kumar", email: "arjun.kumar@gmail.com", phone: "+91-9876543210", source: "REFERRAL", currentCompany: "Flipkart", currentRole: "Frontend Engineer", experienceYears: "5", expectedCtc: "3500000", noticePeriodDays: 30, notes: "Referred by Sneha Patel" },
  { id: "cand-002", name: "Meera Nair", email: "meera.n@outlook.com", phone: "+91-9812345678", source: "JOB_BOARD", currentCompany: "Razorpay", currentRole: "Senior Frontend Dev", experienceYears: "7", expectedCtc: "4000000", noticePeriodDays: 60, notes: null },
  { id: "cand-003", name: "Rohit Verma", email: "rohit.v@gmail.com", phone: "+91-9123456780", source: "DIRECT", currentCompany: "TCS", currentRole: "Software Engineer", experienceYears: "3", expectedCtc: "2800000", noticePeriodDays: 90, notes: "Applied via career page" },
  { id: "cand-004", name: "Pooja Gupta", email: "pooja.gupta@yahoo.com", phone: "+91-9988776655", source: "AGENCY", currentCompany: "Infosys", currentRole: "UI Developer", experienceYears: "4", expectedCtc: "3200000", noticePeriodDays: 30, notes: "Via TalentHire agency" },
  { id: "cand-005", name: "Aditya Rao", email: "aditya.rao@gmail.com", phone: "+91-9876501234", source: "REFERRAL", currentCompany: "Google", currentRole: "Product Manager", experienceYears: "8", expectedCtc: "5000000", noticePeriodDays: 60, notes: "Strong referral from VP Product" },
  { id: "cand-006", name: "Divya Iyer", email: "divya.iyer@gmail.com", phone: "+91-9567891234", source: "JOB_BOARD", currentCompany: "Swiggy", currentRole: "APM", experienceYears: "4", expectedCtc: "3800000", noticePeriodDays: 30, notes: null },
  { id: "cand-007", name: "Siddharth Das", email: "sid.das@hotmail.com", phone: "+91-9678912345", source: "INTERNAL", currentCompany: "Acme Technologies", currentRole: "Junior Engineer", experienceYears: "2", expectedCtc: "2500000", noticePeriodDays: 0, notes: "Internal transfer candidate" },
  { id: "cand-008", name: "Nisha Reddy", email: "nisha.r@gmail.com", phone: "+91-9789123456", source: "DIRECT", currentCompany: "Walmart Labs", currentRole: "Staff Engineer", experienceYears: "10", expectedCtc: "4500000", noticePeriodDays: 60, notes: null },
  { id: "cand-009", name: "Amit Saxena", email: "amit.saxena@gmail.com", phone: "+91-9890234567", source: "JOB_BOARD", currentCompany: "Deloitte", currentRole: "Data Analyst", experienceYears: "3", expectedCtc: "2000000", noticePeriodDays: 30, notes: "Previously filled Data Analyst role" },
  { id: "cand-010", name: "Riya Choudhury", email: "riya.c@gmail.com", phone: "+91-9901345678", source: "REFERRAL", currentCompany: "McKinsey", currentRole: "Business Analyst", experienceYears: "5", expectedCtc: "2200000", noticePeriodDays: 90, notes: "Previously filled Data Analyst role" },
];

// ── Applications (candidates mapped to hiring plans + stages) ──
const hp1Stages = STAGES["hp-001"];
const hp2Stages = STAGES["hp-002"];

export const APPLICATIONS = [
  // hp-001: Senior Frontend Engineer
  { id: "app-001", candidateId: "cand-001", hiringPlanId: "hp-001", currentStageId: hp1Stages[2].id, status: "ACTIVE", appliedAt: "2026-01-12T10:00:00Z", stageEnteredAt: "2026-01-20T14:00:00Z", completedAt: null, rejectionReason: null, selectionNotes: null, totalScore: "82", aiSummary: "Strong frontend candidate with solid React/TS skills. Good culture fit. Recommend moving forward.", candidate: CANDIDATES[0], hiringPlan: { id: "hp-001", title: "Senior Frontend Engineer", department: "Engineering", designation: "Senior Software Engineer" }, currentStage: hp1Stages[2] },
  { id: "app-002", candidateId: "cand-002", hiringPlanId: "hp-001", currentStageId: hp1Stages[4].id, status: "ACTIVE", appliedAt: "2026-01-10T09:00:00Z", stageEnteredAt: "2026-02-01T10:00:00Z", completedAt: null, rejectionReason: null, selectionNotes: null, totalScore: "91", aiSummary: "Exceptional candidate. 7 years experience. Top performer at Razorpay. Strong recommendation.", candidate: CANDIDATES[1], hiringPlan: { id: "hp-001", title: "Senior Frontend Engineer", department: "Engineering", designation: "Senior Software Engineer" }, currentStage: hp1Stages[4] },
  { id: "app-003", candidateId: "cand-003", hiringPlanId: "hp-001", currentStageId: hp1Stages[1].id, status: "ACTIVE", appliedAt: "2026-01-25T11:00:00Z", stageEnteredAt: "2026-01-28T09:00:00Z", completedAt: null, rejectionReason: null, selectionNotes: null, totalScore: null, aiSummary: null, candidate: CANDIDATES[2], hiringPlan: { id: "hp-001", title: "Senior Frontend Engineer", department: "Engineering", designation: "Senior Software Engineer" }, currentStage: hp1Stages[1] },
  { id: "app-004", candidateId: "cand-004", hiringPlanId: "hp-001", currentStageId: null, status: "REJECTED", appliedAt: "2026-01-08T10:00:00Z", stageEnteredAt: "2026-01-15T10:00:00Z", completedAt: "2026-01-18T16:00:00Z", rejectionReason: "Insufficient TypeScript experience for senior role", selectionNotes: null, totalScore: "54", aiSummary: "Below expectations on technical skills. Lacks depth in TypeScript and system design.", candidate: CANDIDATES[3], hiringPlan: { id: "hp-001", title: "Senior Frontend Engineer", department: "Engineering", designation: "Senior Software Engineer" }, currentStage: null },
  { id: "app-005", candidateId: "cand-007", hiringPlanId: "hp-001", currentStageId: hp1Stages[0].id, status: "ACTIVE", appliedAt: "2026-02-05T10:00:00Z", stageEnteredAt: "2026-02-05T10:00:00Z", completedAt: null, rejectionReason: null, selectionNotes: null, totalScore: null, aiSummary: null, candidate: CANDIDATES[6], hiringPlan: { id: "hp-001", title: "Senior Frontend Engineer", department: "Engineering", designation: "Senior Software Engineer" }, currentStage: hp1Stages[0] },
  { id: "app-006", candidateId: "cand-008", hiringPlanId: "hp-001", currentStageId: hp1Stages[5].id, status: "SELECTED", appliedAt: "2025-12-20T10:00:00Z", stageEnteredAt: "2026-01-25T10:00:00Z", completedAt: "2026-02-01T16:00:00Z", rejectionReason: null, selectionNotes: "Outstanding candidate. Accepted offer at 42 LPA.", totalScore: "95", aiSummary: "Exceptional senior engineer. 10 years experience. Strong across all dimensions.", candidate: CANDIDATES[7], hiringPlan: { id: "hp-001", title: "Senior Frontend Engineer", department: "Engineering", designation: "Senior Software Engineer" }, currentStage: hp1Stages[5] },

  // hp-002: Product Manager — Growth
  { id: "app-007", candidateId: "cand-005", hiringPlanId: "hp-002", currentStageId: hp2Stages[3].id, status: "ACTIVE", appliedAt: "2026-01-15T10:00:00Z", stageEnteredAt: "2026-02-10T14:00:00Z", completedAt: null, rejectionReason: null, selectionNotes: null, totalScore: "88", aiSummary: "Excellent product sense. Strong analytical mindset. Google experience is a plus.", candidate: CANDIDATES[4], hiringPlan: { id: "hp-002", title: "Product Manager — Growth", department: "Product", designation: "Senior Product Manager" }, currentStage: hp2Stages[3] },
  { id: "app-008", candidateId: "cand-006", hiringPlanId: "hp-002", currentStageId: hp2Stages[1].id, status: "ACTIVE", appliedAt: "2026-02-01T09:00:00Z", stageEnteredAt: "2026-02-08T10:00:00Z", completedAt: null, rejectionReason: null, selectionNotes: null, totalScore: null, aiSummary: null, candidate: CANDIDATES[5], hiringPlan: { id: "hp-002", title: "Product Manager — Growth", department: "Product", designation: "Senior Product Manager" }, currentStage: hp2Stages[1] },
];

// ── Stage History (for application detail) ─────────────────────
function makeStageHistory(app: typeof APPLICATIONS[0], planId: string) {
  const stages = STAGES[planId];
  const currentIdx = stages.findIndex((s) => s.id === app.currentStageId);
  const history = [];
  for (let i = 0; i <= Math.max(currentIdx, 0); i++) {
    history.push({
      id: `sh-${app.id}-${i}`,
      stageId: stages[i].id,
      enteredAt: new Date(new Date(app.appliedAt).getTime() + i * 5 * 86400000).toISOString(),
      exitedAt: i < currentIdx ? new Date(new Date(app.appliedAt).getTime() + (i + 1) * 5 * 86400000).toISOString() : null,
      outcome: i < currentIdx ? "PASSED" : null,
      stage: { id: stages[i].id, name: stages[i].name, stageType: stages[i].stageType },
    });
  }
  return history;
}

export function getApplicationDetail(appId: string) {
  const app = APPLICATIONS.find((a) => a.id === appId);
  if (!app) return null;
  return {
    ...app,
    stageHistory: makeStageHistory(app, app.hiringPlanId),
  };
}

// ── Kanban Pipeline Data ───────────────────────────────────────
export function getPipeline(planId: string) {
  const stages = STAGES[planId] || [];
  const apps = APPLICATIONS.filter((a) => a.hiringPlanId === planId);

  return stages.map((stage) => {
    const stageCandidates = apps
      .filter((a) => a.currentStageId === stage.id && a.status === "ACTIVE")
      .map((a) => ({
        applicationId: a.id,
        candidateId: a.candidateId,
        name: a.candidate.name,
        email: a.candidate.email,
        currentRole: a.candidate.currentRole,
        currentCompany: a.candidate.currentCompany,
        experienceYears: a.candidate.experienceYears ? Number(a.candidate.experienceYears) : null,
        totalScore: a.totalScore ? Number(a.totalScore) : null,
        daysInStage: Math.floor((Date.now() - new Date(a.stageEnteredAt).getTime()) / 86400000),
        stageEnteredAt: a.stageEnteredAt,
      }));
    return {
      ...stage,
      candidateCount: stageCandidates.length,
      avgDaysInStage: stageCandidates.length > 0 ? Math.round(stageCandidates.reduce((s, c) => s + c.daysInStage, 0) / stageCandidates.length) : 0,
      candidates: stageCandidates,
    };
  });
}

export function getPipelineStats(planId: string) {
  const apps = APPLICATIONS.filter((a) => a.hiringPlanId === planId);
  return {
    totalCandidates: apps.length,
    activeCandidates: apps.filter((a) => a.status === "ACTIVE").length,
    selected: apps.filter((a) => a.status === "SELECTED").length,
    rejected: apps.filter((a) => a.status === "REJECTED").length,
    rejectionRate: apps.length > 0 ? Math.round((apps.filter((a) => a.status === "REJECTED").length / apps.length) * 100) : 0,
  };
}

// ── Job Descriptions ───────────────────────────────────────────
export const JOB_DESCRIPTIONS: Record<string, object> = {
  "hp-001": {
    id: "jd-001",
    hiringPlanId: "hp-001",
    version: 2,
    status: "APPROVED",
    generatedByAi: true,
    content: {
      title: "Senior Frontend Engineer",
      summary: "We are looking for a Senior Frontend Engineer to join our engineering team at Acme Technologies. You will build high-performance, user-centric web applications using React and TypeScript, mentor junior developers, and collaborate with product and design teams to ship features that delight millions of users.",
      responsibilities: [
        "Design and implement complex UI components and features using React 19 and TypeScript",
        "Lead frontend architecture decisions and establish coding standards",
        "Mentor junior engineers through code reviews and pair programming",
        "Collaborate with product managers and designers to translate requirements into technical solutions",
        "Optimize application performance, accessibility, and SEO",
        "Contribute to the component library and design system",
        "Participate in on-call rotation for frontend infrastructure",
      ],
      qualifications: {
        required: [
          "5+ years of professional frontend development experience",
          "Expert-level proficiency in React and TypeScript",
          "Strong understanding of web performance optimization techniques",
          "Experience with system design for frontend applications",
          "Familiarity with CI/CD pipelines and testing frameworks",
        ],
        preferred: [
          "Experience with Next.js or similar SSR frameworks",
          "Contributions to open-source projects",
          "Experience leading or mentoring a team of engineers",
          "Knowledge of Node.js backend development",
        ],
      },
      aboutCompany: "Acme Technologies is a fast-growing technology company building the future of enterprise workflow automation. With 200+ employees across India and the US, we are backed by top-tier investors and serve Fortune 500 clients.",
      workMode: "Hybrid — 3 days in office (Bangalore)",
    },
    fitmentMapping: {
      role: "Senior Frontend Engineer",
      designation: "Senior Software Engineer",
      ctcRange: { min: 2500000, max: 4000000, currency: "INR" },
      reportingTo: "Anita Desai",
      hod: "CTO",
      teamSize: 12,
      teamLevels: "L4-L6",
      industry: "Technology",
    },
    evaluationParameters: {
      technicalSkills: [
        { name: "React", proficiencyExpected: 4, assessmentCriteria: "Build complex components, hooks, state management" },
        { name: "TypeScript", proficiencyExpected: 4, assessmentCriteria: "Advanced types, generics, type guards" },
        { name: "System Design", proficiencyExpected: 3, assessmentCriteria: "Frontend architecture, micro-frontends, state patterns" },
      ],
      leadershipSkills: [
        { name: "Team Leadership", indicators: ["Mentors juniors", "Leads design discussions", "Drives technical decisions"] },
      ],
      behaviouralSkills: [
        { name: "Problem Solving", assessmentCriteria: "Approaches ambiguous problems systematically" },
        { name: "Communication", assessmentCriteria: "Articulates technical concepts clearly to non-technical stakeholders" },
      ],
    },
    createdBy: { id: "usr-002", name: "Rahul Mehta" },
    approvedBy: { id: "usr-003", name: "Anita Desai" },
    approvedAt: "2026-01-12T16:30:00Z",
    createdAt: "2026-01-10T14:00:00Z",
  },
  "hp-002": {
    id: "jd-002",
    hiringPlanId: "hp-002",
    version: 1,
    status: "DRAFT",
    generatedByAi: true,
    content: {
      title: "Senior Product Manager — Growth",
      summary: "Join Acme Technologies as a Senior Product Manager to drive user growth and engagement. You will own the growth roadmap, run experiments, and work cross-functionally with engineering, design, and marketing to scale our user base.",
      responsibilities: [
        "Define and own the growth product roadmap and OKRs",
        "Design and run A/B experiments to optimize user acquisition and retention",
        "Analyze product metrics and user behaviour to identify growth opportunities",
        "Collaborate with engineering teams to ship growth features rapidly",
        "Present insights and strategy to leadership and stakeholders",
      ],
      qualifications: {
        required: [
          "5+ years of product management experience with a focus on growth",
          "Strong analytical and data-driven decision making",
          "Experience with A/B testing frameworks and growth experimentation",
          "Excellent communication and stakeholder management skills",
        ],
        preferred: [
          "Experience at a high-growth startup or tech company",
          "SQL proficiency and experience with analytics tools",
          "MBA or equivalent business education",
        ],
      },
      aboutCompany: "Acme Technologies is a fast-growing technology company building the future of enterprise workflow automation.",
      workMode: "Remote-first with quarterly offsites",
    },
    fitmentMapping: {
      role: "Senior Product Manager — Growth",
      designation: "Senior Product Manager",
      ctcRange: { min: 3000000, max: 5000000, currency: "INR" },
      reportingTo: "Vikram Joshi",
      hod: "VP Product",
      teamSize: 6,
      teamLevels: "L5-L6",
      industry: "Technology",
    },
    evaluationParameters: {
      technicalSkills: [
        { name: "Product Management", proficiencyExpected: 4, assessmentCriteria: "Roadmap ownership, feature prioritization, stakeholder alignment" },
        { name: "Data Analysis", proficiencyExpected: 3, assessmentCriteria: "SQL, analytics dashboards, metric interpretation" },
      ],
      leadershipSkills: [
        { name: "Strategic Thinking", indicators: ["Long-term vision", "Market awareness", "Competitive analysis"] },
      ],
      behaviouralSkills: [
        { name: "Communication", assessmentCriteria: "Presents complex ideas simply, influences without authority" },
      ],
    },
    createdBy: { id: "usr-002", name: "Rahul Mehta" },
    approvedBy: null,
    approvedAt: null,
    createdAt: "2026-01-20T10:00:00Z",
  },
};

// ── Feedback ───────────────────────────────────────────────────
export const FEEDBACKS = [
  {
    id: "fb-001",
    applicationId: "app-001",
    stageId: "stg-hp-001-3",
    interviewerId: "usr-005",
    overallRating: 4,
    recommendation: "YES",
    strengths: "Strong React knowledge. Built a complex dashboard in live coding. Clean code structure.",
    concerns: "Could improve on system design depth — struggled slightly with state management at scale.",
    qualitativeNotes: "Good communicator. Collaborative attitude. Would work well with the team.",
    durationMinutes: 60,
    isSubmitted: true,
    submittedAt: "2026-01-22T15:00:00Z",
    interviewer: { id: "usr-005", name: "Sneha Patel", email: "interviewer@acme.com" },
    stage: { id: "stg-hp-001-3", name: "Technical Round", stageType: "TECHNICAL", stageOrder: 3 },
    skillRatings: [
      { skill: SKILLS[0], rating: 4, notes: "Solid React hooks and patterns" },
      { skill: SKILLS[1], rating: 4, notes: "Good TypeScript usage" },
      { skill: SKILLS[5], rating: 3, notes: "Needs improvement on large-scale system design" },
    ],
  },
  {
    id: "fb-002",
    applicationId: "app-002",
    stageId: "stg-hp-001-3",
    interviewerId: "usr-005",
    overallRating: 5,
    recommendation: "STRONG_YES",
    strengths: "Exceptional technical depth. Built micro-frontend architecture at Razorpay. Excellent system design.",
    concerns: "None significant. Slightly overqualified for the role level but enthusiastic about the opportunity.",
    qualitativeNotes: "One of the best candidates I've interviewed. Strong recommend.",
    durationMinutes: 75,
    isSubmitted: true,
    submittedAt: "2026-01-25T11:00:00Z",
    interviewer: { id: "usr-005", name: "Sneha Patel", email: "interviewer@acme.com" },
    stage: { id: "stg-hp-001-3", name: "Technical Round", stageType: "TECHNICAL", stageOrder: 3 },
    skillRatings: [
      { skill: SKILLS[0], rating: 5, notes: "Expert-level React. Deep knowledge of internals." },
      { skill: SKILLS[1], rating: 5, notes: "TypeScript generics, utility types — all solid" },
      { skill: SKILLS[5], rating: 5, notes: "Designed Razorpay's checkout micro-frontend" },
    ],
  },
  {
    id: "fb-003",
    applicationId: "app-002",
    stageId: "stg-hp-001-4",
    interviewerId: "usr-002",
    overallRating: 4,
    recommendation: "YES",
    strengths: "Great culture fit. Aligned with Acme values. Clear career goals.",
    concerns: "Salary expectations on the higher end — may need negotiation.",
    qualitativeNotes: "Confident, articulate, and professional.",
    durationMinutes: 45,
    isSubmitted: true,
    submittedAt: "2026-01-28T14:00:00Z",
    interviewer: { id: "usr-002", name: "Rahul Mehta", email: "hr@acme.com" },
    stage: { id: "stg-hp-001-4", name: "HR Round", stageType: "HR", stageOrder: 4 },
    skillRatings: [
      { skill: SKILLS[8], rating: 5, notes: "Excellent communicator" },
      { skill: SKILLS[10], rating: 4, notes: "Collaborative mindset" },
    ],
  },
  {
    id: "fb-004",
    applicationId: "app-007",
    stageId: "stg-hp-002-3",
    interviewerId: "usr-005",
    overallRating: 4,
    recommendation: "YES",
    strengths: "Strong product sense from Google. Data-driven approach. Good case study performance.",
    concerns: "May find startup pace different from Google. Needs to validate adaptability.",
    qualitativeNotes: "Impressed with product strategy thinking. Recommend for HR round.",
    durationMinutes: 60,
    isSubmitted: true,
    submittedAt: "2026-02-12T16:00:00Z",
    interviewer: { id: "usr-005", name: "Sneha Patel", email: "interviewer@acme.com" },
    stage: { id: "stg-hp-002-3", name: "Technical Round", stageType: "TECHNICAL", stageOrder: 3 },
    skillRatings: [
      { skill: SKILLS[11], rating: 4, notes: "Strong product management skills" },
      { skill: SKILLS[7], rating: 4, notes: "Good strategic thinking" },
    ],
  },
];

// ── Decisions ──────────────────────────────────────────────────
export const DECISIONS = [
  {
    id: "dec-001",
    applicationId: "app-006",
    decision: "SELECTED",
    offerCtc: "4200000",
    offerDesignation: "Senior Software Engineer",
    joiningDate: "2026-03-01",
    communicationDraft: { subject: "Congratulations! Offer from Acme Technologies", body: "Dear Nisha,\n\nWe are thrilled to extend an offer for the position of Senior Software Engineer at Acme Technologies.\n\nOffer Details:\n- CTC: ₹42,00,000 per annum\n- Designation: Senior Software Engineer\n- Joining Date: March 1, 2026\n\nPlease find the detailed offer letter attached.\n\nBest regards,\nAcme Technologies HR Team" },
    communicationSent: true,
    communicationSentAt: "2026-02-05T10:00:00Z",
    decidedBy: { id: "usr-003", name: "Anita Desai" },
    approvedBy: { id: "usr-001", name: "Priya Sharma" },
    approvedAt: "2026-02-03T14:00:00Z",
    createdAt: "2026-02-02T16:00:00Z",
    application: { candidate: { name: "Nisha Reddy" } },
  },
  {
    id: "dec-002",
    applicationId: "app-004",
    decision: "REJECTED",
    offerCtc: null,
    offerDesignation: null,
    joiningDate: null,
    communicationDraft: { subject: "Update on your application — Acme Technologies", body: "Dear Pooja,\n\nThank you for taking the time to interview with Acme Technologies for the Senior Frontend Engineer position.\n\nAfter careful consideration, we have decided to move forward with other candidates whose experience more closely aligns with our current needs.\n\nWe were impressed by your enthusiasm and encourage you to apply for future openings.\n\nBest regards,\nAcme Technologies HR Team" },
    communicationSent: true,
    communicationSentAt: "2026-01-20T10:00:00Z",
    decidedBy: { id: "usr-003", name: "Anita Desai" },
    approvedBy: null,
    approvedAt: null,
    createdAt: "2026-01-18T16:00:00Z",
    application: { candidate: { name: "Pooja Gupta" } },
  },
];

// ── Timeline Events ────────────────────────────────────────────
export function getTimeline(appId: string) {
  const app = APPLICATIONS.find((a) => a.id === appId);
  if (!app) return [];
  const events: { type: string; title: string; description: string; timestamp: string; actor?: string }[] = [
    { type: "APPLICATION", title: "Application received", description: `${app.candidate.name} applied for ${app.hiringPlan.title}`, timestamp: app.appliedAt, actor: app.candidate.name },
  ];

  const detail = getApplicationDetail(appId);
  if (detail) {
    detail.stageHistory.forEach((sh) => {
      events.push({ type: "STAGE_MOVE", title: `Moved to ${sh.stage.name}`, description: `Candidate entered ${sh.stage.name} stage`, timestamp: sh.enteredAt, actor: "System" });
    });
  }

  const fb = FEEDBACKS.filter((f) => f.applicationId === appId);
  fb.forEach((f) => {
    events.push({ type: "FEEDBACK", title: `Feedback submitted — ${f.stage.name}`, description: `${f.interviewer.name} rated ${f.overallRating}/5 (${f.recommendation})`, timestamp: f.submittedAt!, actor: f.interviewer.name });
  });

  const dec = DECISIONS.find((d) => d.applicationId === appId);
  if (dec) {
    events.push({ type: "DECISION", title: `Decision: ${dec.decision}`, description: dec.decision === "SELECTED" ? `Offer extended at ₹${Number(dec.offerCtc).toLocaleString("en-IN")}` : "Candidate rejected after evaluation", timestamp: dec.createdAt, actor: dec.decidedBy.name });
  }

  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// ── Analytics ──────────────────────────────────────────────────
export const ANALYTICS = {
  overview: {
    activePlans: 2,
    totalRoles: 8,
    openRoles: 5,
    filledRoles: 3,
    fillRate: 37.5,
    pipelineCandidates: 6,
    selectedCount: 3,
    rejectedCount: 1,
    avgTimeToHire: 34,
    trend: [
      { month: "Oct 2025", count: 1 },
      { month: "Nov 2025", count: 0 },
      { month: "Dec 2025", count: 2 },
      { month: "Jan 2026", count: 1 },
      { month: "Feb 2026", count: 2 },
      { month: "Mar 2026", count: 0 },
    ],
  },
  funnel: [
    { name: "Resume Screening", entered: 10, passed: 8, rejected: 2, passThroughRate: 80, avgDays: 2.5 },
    { name: "Phone Screen", entered: 8, passed: 6, rejected: 2, passThroughRate: 75, avgDays: 4.2 },
    { name: "Technical Round", entered: 6, passed: 4, rejected: 2, passThroughRate: 66.7, avgDays: 6.1 },
    { name: "HR Round", entered: 4, passed: 3, rejected: 1, passThroughRate: 75, avgDays: 3.8 },
    { name: "Leadership Round", entered: 3, passed: 3, rejected: 0, passThroughRate: 100, avgDays: 5.0 },
    { name: "Offer", entered: 3, passed: 3, rejected: 0, passThroughRate: 100, avgDays: 7.5 },
  ],
  progress: [
    { id: "hp-001", title: "Senior Frontend Engineer", totalRoles: 3, filledRoles: 1, inPipeline: 4, progress: 33 },
    { id: "hp-002", title: "Product Manager — Growth", totalRoles: 2, filledRoles: 0, inPipeline: 2, progress: 0 },
    { id: "hp-003", title: "DevOps Engineer", totalRoles: 1, filledRoles: 0, inPipeline: 0, progress: 0 },
    { id: "hp-004", title: "Data Analyst", totalRoles: 2, filledRoles: 2, inPipeline: 0, progress: 100 },
  ],
  cost: [
    { title: "Senior Frontend Engineer", budgetMin: 2500000, budgetMax: 4000000, avgOfferCtc: 4200000, totalSpent: 4200000, filledRoles: 1, totalRoles: 3 },
    { title: "Product Manager — Growth", budgetMin: 3000000, budgetMax: 5000000, avgOfferCtc: 0, totalSpent: 0, filledRoles: 0, totalRoles: 2 },
    { title: "Data Analyst", budgetMin: 1500000, budgetMax: 2500000, avgOfferCtc: 2100000, totalSpent: 4200000, filledRoles: 2, totalRoles: 2 },
  ],
  interviewers: [
    { name: "Sneha Patel", totalInterviews: 12, avgRating: 4.2, avgFeedbackTimeHours: 3.5 },
    { name: "Rahul Mehta", totalInterviews: 8, avgRating: 3.8, avgFeedbackTimeHours: 6.2 },
    { name: "Anita Desai", totalInterviews: 5, avgRating: 4.5, avgFeedbackTimeHours: 2.1 },
    { name: "Vikram Joshi", totalInterviews: 4, avgRating: 4.0, avgFeedbackTimeHours: 4.8 },
  ],
  sources: [
    { source: "REFERRAL", candidates: 4, selected: 2, selectionRate: 50, avgScore: 87 },
    { source: "JOB_BOARD", candidates: 3, selected: 1, selectionRate: 33, avgScore: 72 },
    { source: "DIRECT", candidates: 2, selected: 1, selectionRate: 50, avgScore: 75 },
    { source: "AGENCY", candidates: 1, selected: 0, selectionRate: 0, avgScore: 54 },
    { source: "INTERNAL", candidates: 1, selected: 0, selectionRate: 0, avgScore: 0 },
  ],
  timeToHire: {
    trend: [
      { month: "Oct 2025", avgDays: 28 },
      { month: "Nov 2025", avgDays: 32 },
      { month: "Dec 2025", avgDays: 38 },
      { month: "Jan 2026", avgDays: 35 },
      { month: "Feb 2026", avgDays: 30 },
      { month: "Mar 2026", avgDays: 34 },
    ],
  },
  insights: [
    { title: "Referral pipeline outperforms", description: "Referral candidates have a 50% selection rate vs 33% for job boards. The average score for referrals is 87 vs 72.", severity: "info", category: "sourcing", recommendation: "Increase referral bonus and encourage more employee referrals to improve pipeline quality." },
    { title: "Technical round bottleneck", description: "33% of candidates are rejected at the Technical Round stage, making it the highest drop-off point in the pipeline.", severity: "warning", category: "pipeline", recommendation: "Review technical interview criteria. Consider adding a take-home assignment to pre-filter before the live round." },
    { title: "Feedback turnaround improving", description: "Average feedback submission time has decreased from 6.2 hours to 3.5 hours over the last quarter.", severity: "info", category: "process", recommendation: "Continue encouraging prompt feedback. Recognize top performers like Sneha Patel (3.5h avg)." },
    { title: "Product Manager pipeline thin", description: "Only 2 candidates in the Product Manager pipeline with 0 roles filled. This plan is at risk of timeline slippage.", severity: "critical", category: "hiring", recommendation: "Activate additional sourcing channels for PM roles. Consider engaging a specialized recruiting agency." },
    { title: "Budget utilization healthy", description: "The Senior Frontend Engineer offer at ₹42L is within the ₹25-40L budget range (5% over max). Data Analyst hires averaged ₹21L within the ₹15-25L range.", severity: "info", category: "budget", recommendation: "Monitor frontend engineer offers closely — the first hire was at the upper bound." },
  ],
};

// ── Notifications ──────────────────────────────────────────────
export const NOTIFICATIONS = [
  { id: "notif-001", type: "FEEDBACK_SUBMITTED", title: "New feedback submitted", body: "Sneha Patel submitted feedback for Arjun Kumar — Technical Round", read: false, actionUrl: "/hiring-plans/hp-001", createdAt: "2026-03-25T14:00:00Z" },
  { id: "notif-002", type: "CANDIDATE_MOVED", title: "Candidate advanced", body: "Meera Nair moved to Leadership Round for Senior Frontend Engineer", read: false, actionUrl: "/hiring-plans/hp-001", createdAt: "2026-03-24T11:30:00Z" },
  { id: "notif-003", type: "DECISION_MADE", title: "Offer extended", body: "Nisha Reddy was selected for Senior Frontend Engineer at ₹42L", read: true, actionUrl: "/hiring-plans/hp-001", createdAt: "2026-03-20T16:00:00Z" },
  { id: "notif-004", type: "NEW_APPLICATION", title: "New application", body: "Siddharth Das applied for Senior Frontend Engineer (Internal transfer)", read: true, actionUrl: "/hiring-plans/hp-001", createdAt: "2026-03-18T10:00:00Z" },
  { id: "notif-005", type: "PLAN_CREATED", title: "New hiring plan", body: "DevOps Engineer plan created by Priya Sharma", read: true, actionUrl: "/hiring-plans/hp-003", createdAt: "2026-03-15T10:00:00Z" },
];

// ── Audit Log ──────────────────────────────────────────────────
export const AUDIT_LOG = [
  { id: "aud-001", action: "CREATE", entityType: "HiringPlan", entityId: "hp-003", changes: { title: "DevOps Engineer", status: "DRAFT" }, createdAt: "2026-03-25T10:00:00Z", user: { id: "usr-001", name: "Priya Sharma", email: "admin@acme.com" } },
  { id: "aud-002", action: "UPDATE", entityType: "HiringPlan", entityId: "hp-001", changes: { status: { from: "DRAFT", to: "ACTIVE" } }, createdAt: "2026-03-24T14:30:00Z", user: { id: "usr-002", name: "Rahul Mehta", email: "hr@acme.com" } },
  { id: "aud-003", action: "CREATE", entityType: "Application", entityId: "app-005", changes: { candidate: "Siddharth Das", plan: "Senior Frontend Engineer" }, createdAt: "2026-03-22T10:00:00Z", user: { id: "usr-002", name: "Rahul Mehta", email: "hr@acme.com" } },
  { id: "aud-004", action: "CREATE", entityType: "Decision", entityId: "dec-001", changes: { decision: "SELECTED", candidate: "Nisha Reddy", offerCtc: 4200000 }, createdAt: "2026-03-20T16:00:00Z", user: { id: "usr-003", name: "Anita Desai", email: "eng-mgr@acme.com" } },
  { id: "aud-005", action: "CREATE", entityType: "Feedback", entityId: "fb-001", changes: { candidate: "Arjun Kumar", stage: "Technical Round", rating: 4 }, createdAt: "2026-03-19T15:00:00Z", user: { id: "usr-005", name: "Sneha Patel", email: "interviewer@acme.com" } },
  { id: "aud-006", action: "UPDATE", entityType: "User", entityId: "usr-007", changes: { isActive: { from: true, to: false } }, createdAt: "2026-03-18T09:00:00Z", user: { id: "usr-001", name: "Priya Sharma", email: "admin@acme.com" } },
  { id: "aud-007", action: "CREATE", entityType: "Decision", entityId: "dec-002", changes: { decision: "REJECTED", candidate: "Pooja Gupta" }, createdAt: "2026-03-17T16:00:00Z", user: { id: "usr-003", name: "Anita Desai", email: "eng-mgr@acme.com" } },
  { id: "aud-008", action: "UPDATE", entityType: "Settings", entityId: ORG_ID, changes: { maxInterviewRounds: { from: 5, to: 6 } }, createdAt: "2026-03-16T11:00:00Z", user: { id: "usr-001", name: "Priya Sharma", email: "admin@acme.com" } },
  { id: "aud-009", action: "CREATE", entityType: "HiringPlan", entityId: "hp-002", changes: { title: "Product Manager — Growth", status: "ACTIVE" }, createdAt: "2026-03-15T10:00:00Z", user: { id: "usr-002", name: "Rahul Mehta", email: "hr@acme.com" } },
  { id: "aud-010", action: "UPDATE", entityType: "JobDescription", entityId: "jd-001", changes: { status: { from: "DRAFT", to: "APPROVED" } }, createdAt: "2026-03-14T16:30:00Z", user: { id: "usr-003", name: "Anita Desai", email: "eng-mgr@acme.com" } },
];

// ── Training Modules ───────────────────────────────────────────
export const TRAINING_MODULES = [
  { id: "tm-001", title: "Writing Effective Job Descriptions", category: "JD_FORMAT", isDefault: true, estimatedMinutes: 20, completed: true, completedAt: "2026-02-10T10:00:00Z" },
  { id: "tm-002", title: "Structured Interviewing Techniques", category: "INTERVIEWING_SKILLS", isDefault: true, estimatedMinutes: 30, completed: true, completedAt: "2026-02-12T14:00:00Z" },
  { id: "tm-003", title: "Writing Constructive Feedback", category: "FEEDBACK_GUIDELINES", isDefault: true, estimatedMinutes: 15, completed: false, completedAt: null },
  { id: "tm-004", title: "End-to-End Hiring Process", category: "HIRING_PROCESS", isDefault: true, estimatedMinutes: 25, completed: false, completedAt: null },
];

// ── Settings ───────────────────────────────────────────────────
export const SETTINGS = {
  settings: {
    scoringWeights: { technical: 40, leadership: 25, behavioural: 20, communication: 15 },
    defaultPipelineStages: ["Resume Screening", "Phone Screen", "Technical Round", "HR Round", "Leadership Round", "Offer"],
    notificationPreferences: { feedbackSubmitted: true, candidateMoved: true, decisionMade: true, newApplication: true },
    approvalWorkflowEnabled: false,
    maxInterviewRounds: 6,
  },
};

// =============================================================
// SUPPORT PORTAL MOCK DATA
// =============================================================

export const SUPPORT_ORGANIZATIONS = [
  { id: "org-001", name: "Acme Technologies", industry: "Technology", createdAt: "2025-10-01T10:00:00Z", _count: { users: 7, hiringPlans: 3, supportTickets: 2 }, healthScore: 85, riskFlags: [] },
  { id: "org-002", name: "Meridian Healthcare", industry: "Healthcare", createdAt: "2025-11-15T10:00:00Z", _count: { users: 12, hiringPlans: 5, supportTickets: 1 }, healthScore: 72, riskFlags: ["Low fill rate"] },
  { id: "org-003", name: "Nova Financial", industry: "Finance", createdAt: "2025-09-20T10:00:00Z", _count: { users: 4, hiringPlans: 2, supportTickets: 4 }, healthScore: 45, riskFlags: ["High open ticket count", "Low user count"] },
  { id: "org-004", name: "GreenLeaf Retail", industry: "Retail", createdAt: "2026-01-05T10:00:00Z", _count: { users: 8, hiringPlans: 4, supportTickets: 0 }, healthScore: 92, riskFlags: [] },
  { id: "org-005", name: "TechVista Solutions", industry: "Technology", createdAt: "2026-02-10T10:00:00Z", _count: { users: 2, hiringPlans: 0, supportTickets: 3 }, healthScore: 30, riskFlags: ["No active hiring plans", "Low user count", "High open ticket count"] },
];

export const SUPPORT_DASHBOARD = {
  totalOrgs: 5,
  totalUsers: 33,
  activeUsers: 28,
  totalActivePlans: 10,
  totalOpenTickets: 8,
  orgsNeedingAttention: 2,
  recentOrgs: SUPPORT_ORGANIZATIONS.slice(0, 5).map((o) => ({ id: o.id, name: o.name, industry: o.industry, createdAt: o.createdAt })),
};

export const ORG_DETAIL: Record<string, any> = {
  "org-001": {
    id: "org-001", name: "Acme Technologies", industry: "Technology", createdAt: "2025-10-01T10:00:00Z",
    _count: { users: 7, hiringPlans: 3, candidates: 15, supportTickets: 2 },
    activePlans: 2, activeUsers: 6, openTickets: 1,
    latestHealth: { healthScore: 85, activeUsers: 6, hiringPlanCount: 2, openRoles: 5, fillRate: 40, riskFlags: [] },
    settings: null,
  },
  "org-002": {
    id: "org-002", name: "Meridian Healthcare", industry: "Healthcare", createdAt: "2025-11-15T10:00:00Z",
    _count: { users: 12, hiringPlans: 5, candidates: 30, supportTickets: 1 },
    activePlans: 3, activeUsers: 10, openTickets: 0,
    latestHealth: { healthScore: 72, activeUsers: 10, hiringPlanCount: 3, openRoles: 12, fillRate: 25, riskFlags: ["Low fill rate"] },
    settings: null,
  },
  "org-003": {
    id: "org-003", name: "Nova Financial", industry: "Finance", createdAt: "2025-09-20T10:00:00Z",
    _count: { users: 4, hiringPlans: 2, candidates: 8, supportTickets: 4 },
    activePlans: 1, activeUsers: 3, openTickets: 3,
    latestHealth: { healthScore: 45, activeUsers: 3, hiringPlanCount: 1, openRoles: 4, fillRate: 20, riskFlags: ["High open ticket count", "Low user count"] },
    settings: null,
  },
};

export const ORG_USERS: Record<string, any[]> = {
  "org-001": USERS,
  "org-002": [
    { id: "usr-m1", name: "Dr. Meena Reddy", email: "meena@meridian.com", role: "ADMIN", isActive: true, createdAt: "2025-11-15T10:00:00Z" },
    { id: "usr-m2", name: "Arun Kumar", email: "arun@meridian.com", role: "HR", isActive: true, createdAt: "2025-11-16T10:00:00Z" },
    { id: "usr-m3", name: "Sunita Verma", email: "sunita@meridian.com", role: "HIRING_MANAGER", isActive: true, createdAt: "2025-11-17T10:00:00Z" },
    { id: "usr-m4", name: "Rajesh Gupta", email: "rajesh@meridian.com", role: "INTERVIEWER", isActive: true, createdAt: "2025-11-18T10:00:00Z" },
    { id: "usr-m5", name: "Priya Nair", email: "priya.n@meridian.com", role: "VIEWER", isActive: false, createdAt: "2025-12-01T10:00:00Z" },
  ],
  "org-003": [
    { id: "usr-n1", name: "Amit Shah", email: "amit@nova.com", role: "ADMIN", isActive: true, createdAt: "2025-09-20T10:00:00Z" },
    { id: "usr-n2", name: "Deepa Rao", email: "deepa@nova.com", role: "HR", isActive: true, createdAt: "2025-09-21T10:00:00Z" },
    { id: "usr-n3", name: "Nikhil Jain", email: "nikhil@nova.com", role: "HIRING_MANAGER", isActive: true, createdAt: "2025-10-01T10:00:00Z" },
  ],
};

export const ORG_HIRING_PLANS: Record<string, any[]> = {
  "org-001": HIRING_PLANS.map((p) => ({ ...p, hiringManager: p.hiringManager || { name: "Anita Desai" } })),
  "org-002": [
    { id: "hp-m1", title: "Senior Nurse Practitioner", department: "Nursing", status: "ACTIVE", totalRoles: 5, filledRoles: 1, hiringManager: { name: "Dr. Meena Reddy" } },
    { id: "hp-m2", title: "Lab Technician", department: "Pathology", status: "ACTIVE", totalRoles: 3, filledRoles: 0, hiringManager: { name: "Sunita Verma" } },
    { id: "hp-m3", title: "Hospital Administrator", department: "Admin", status: "DRAFT", totalRoles: 1, filledRoles: 0, hiringManager: { name: "Dr. Meena Reddy" } },
  ],
  "org-003": [
    { id: "hp-n1", title: "Risk Analyst", department: "Risk", status: "ACTIVE", totalRoles: 2, filledRoles: 0, hiringManager: { name: "Nikhil Jain" } },
    { id: "hp-n2", title: "Compliance Officer", department: "Compliance", status: "DRAFT", totalRoles: 1, filledRoles: 0, hiringManager: { name: "Amit Shah" } },
  ],
};

export const ORG_HEALTH_METRICS: Record<string, any[]> = {
  "org-001": [
    { metricDate: "2025-10-01", healthScore: 60, activeUsers: 3, fillRate: 0, openRoles: 0 },
    { metricDate: "2025-11-01", healthScore: 70, activeUsers: 5, fillRate: 10, openRoles: 3 },
    { metricDate: "2025-12-01", healthScore: 75, activeUsers: 6, fillRate: 20, openRoles: 5 },
    { metricDate: "2026-01-01", healthScore: 80, activeUsers: 6, fillRate: 30, openRoles: 4 },
    { metricDate: "2026-02-01", healthScore: 82, activeUsers: 6, fillRate: 35, openRoles: 5 },
    { metricDate: "2026-03-01", healthScore: 85, activeUsers: 6, fillRate: 40, openRoles: 5 },
  ],
  "org-002": [
    { metricDate: "2025-11-15", healthScore: 50, activeUsers: 5, fillRate: 0, openRoles: 0 },
    { metricDate: "2025-12-01", healthScore: 60, activeUsers: 8, fillRate: 5, openRoles: 8 },
    { metricDate: "2026-01-01", healthScore: 65, activeUsers: 9, fillRate: 10, openRoles: 10 },
    { metricDate: "2026-02-01", healthScore: 70, activeUsers: 10, fillRate: 20, openRoles: 12 },
    { metricDate: "2026-03-01", healthScore: 72, activeUsers: 10, fillRate: 25, openRoles: 12 },
  ],
  "org-003": [
    { metricDate: "2025-10-01", healthScore: 65, activeUsers: 4, fillRate: 0, openRoles: 0 },
    { metricDate: "2025-11-01", healthScore: 55, activeUsers: 4, fillRate: 0, openRoles: 2 },
    { metricDate: "2025-12-01", healthScore: 50, activeUsers: 3, fillRate: 0, openRoles: 4 },
    { metricDate: "2026-01-01", healthScore: 48, activeUsers: 3, fillRate: 10, openRoles: 4 },
    { metricDate: "2026-02-01", healthScore: 45, activeUsers: 3, fillRate: 15, openRoles: 4 },
    { metricDate: "2026-03-01", healthScore: 45, activeUsers: 3, fillRate: 20, openRoles: 4 },
  ],
};

// ── Support Tickets ───────────────────────────────────────────
const SUP_USER = { id: "sup-001", name: "Ravi Support" };

export const SUPPORT_TICKETS = [
  {
    id: "tkt-001", orgId: "org-001", title: "Login issues for new employees", description: "Three new employees cannot log in after onboarding. Auth0 provisioning seems stuck.",
    status: "OPEN", priority: "HIGH", category: "TECHNICAL", reportedBy: "Priya Sharma", assigneeId: "sup-001",
    slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), firstResponseAt: null, resolvedAt: null, closedAt: null,
    tags: ["auth", "onboarding"], createdAt: "2026-03-25T10:00:00Z", updatedAt: "2026-03-25T10:00:00Z",
    organization: { id: "org-001", name: "Acme Technologies", industry: "Technology" },
    assignee: SUP_USER,
    _count: { notes: 2, escalations: 0 },
    notes: [
      { id: "note-001", content: "Checking Auth0 logs for failed provisioning events.", isInternal: true, createdAt: "2026-03-25T10:30:00Z", author: SUP_USER },
      { id: "note-002", content: "Found the issue — Auth0 connection was rate-limited. Resetting now.", isInternal: true, createdAt: "2026-03-25T11:00:00Z", author: SUP_USER },
    ],
    escalations: [],
  },
  {
    id: "tkt-002", orgId: "org-003", title: "Dashboard charts not loading", description: "Analytics dashboard shows blank charts. Console shows 500 errors from /api/analytics.",
    status: "IN_PROGRESS", priority: "CRITICAL", category: "BUG_REPORT", reportedBy: "Amit Shah", assigneeId: "sup-001",
    slaDeadline: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), firstResponseAt: "2026-03-24T15:00:00Z", resolvedAt: null, closedAt: null,
    tags: ["analytics", "bug"], createdAt: "2026-03-24T14:00:00Z", updatedAt: "2026-03-25T09:00:00Z",
    organization: { id: "org-003", name: "Nova Financial", industry: "Finance" },
    assignee: SUP_USER,
    _count: { notes: 3, escalations: 1 },
    notes: [
      { id: "note-003", content: "Investigating backend analytics service.", isInternal: true, createdAt: "2026-03-24T15:00:00Z", author: SUP_USER },
      { id: "note-004", content: "Hi Amit, we're looking into this. The analytics service had a temporary issue.", isInternal: false, createdAt: "2026-03-24T15:30:00Z", author: SUP_USER },
      { id: "note-005", content: "Root cause: missing index on candidate_applications causing query timeout.", isInternal: true, createdAt: "2026-03-25T09:00:00Z", author: SUP_USER },
    ],
    escalations: [
      { id: "esc-001", level: "L2", reason: "Query timeout causing 500 errors, requires DB optimization.", createdAt: "2026-03-24T18:00:00Z", resolvedAt: null, escalatedBy: SUP_USER },
    ],
  },
  {
    id: "tkt-003", orgId: "org-002", title: "Request to add custom pipeline stage", description: "Meridian wants to add a 'Background Check' stage between HR Round and Offer.",
    status: "WAITING_ON_CLIENT", priority: "MEDIUM", category: "FEATURE_REQUEST", reportedBy: "Arun Kumar", assigneeId: "sup-001",
    slaDeadline: new Date(Date.now() + 16 * 60 * 60 * 1000).toISOString(), firstResponseAt: "2026-03-22T11:00:00Z", resolvedAt: null, closedAt: null,
    tags: ["pipeline", "feature"], createdAt: "2026-03-22T10:00:00Z", updatedAt: "2026-03-23T14:00:00Z",
    organization: { id: "org-002", name: "Meridian Healthcare", industry: "Healthcare" },
    assignee: SUP_USER,
    _count: { notes: 1, escalations: 0 },
    notes: [
      { id: "note-006", content: "Custom stages are already supported via CUSTOM stage type. Sent instructions to client.", isInternal: false, createdAt: "2026-03-22T11:00:00Z", author: SUP_USER },
    ],
    escalations: [],
  },
  {
    id: "tkt-004", orgId: "org-003", title: "Billing dispute - overcharged seats", description: "Nova Financial claims they were charged for 10 seats but only have 4 active users.",
    status: "ESCALATED", priority: "HIGH", category: "BILLING", reportedBy: "Deepa Rao", assigneeId: null,
    slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), firstResponseAt: "2026-03-23T10:00:00Z", resolvedAt: null, closedAt: null,
    tags: ["billing", "dispute"], createdAt: "2026-03-23T09:00:00Z", updatedAt: "2026-03-24T10:00:00Z",
    organization: { id: "org-003", name: "Nova Financial", industry: "Finance" },
    assignee: null,
    _count: { notes: 1, escalations: 1 },
    notes: [
      { id: "note-007", content: "Escalated to billing team for review.", isInternal: true, createdAt: "2026-03-23T10:00:00Z", author: SUP_USER },
    ],
    escalations: [
      { id: "esc-002", level: "L3", reason: "Billing dispute requires finance team review.", createdAt: "2026-03-23T10:30:00Z", resolvedAt: null, escalatedBy: SUP_USER },
    ],
  },
  {
    id: "tkt-005", orgId: "org-004", title: "Onboarding assistance for new team", description: "GreenLeaf added 3 new hiring managers. Need onboarding walkthrough.",
    status: "RESOLVED", priority: "LOW", category: "ONBOARDING", reportedBy: "Support Team", assigneeId: "sup-001",
    slaDeadline: "2026-03-25T10:00:00Z", firstResponseAt: "2026-03-20T11:00:00Z", resolvedAt: "2026-03-21T16:00:00Z", closedAt: null,
    tags: ["onboarding"], createdAt: "2026-03-20T10:00:00Z", updatedAt: "2026-03-21T16:00:00Z",
    organization: { id: "org-004", name: "GreenLeaf Retail", industry: "Retail" },
    assignee: SUP_USER,
    _count: { notes: 2, escalations: 0 },
    notes: [
      { id: "note-008", content: "Scheduled onboarding call for tomorrow.", isInternal: false, createdAt: "2026-03-20T11:00:00Z", author: SUP_USER },
      { id: "note-009", content: "Onboarding completed. All 3 managers are set up.", isInternal: false, createdAt: "2026-03-21T16:00:00Z", author: SUP_USER },
    ],
    escalations: [],
  },
  {
    id: "tkt-006", orgId: "org-005", title: "Cannot create hiring plan", description: "Getting validation error when trying to create first hiring plan. Fields seem correct.",
    status: "OPEN", priority: "MEDIUM", category: "BUG_REPORT", reportedBy: "admin@techvista.com", assigneeId: null,
    slaDeadline: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(), firstResponseAt: null, resolvedAt: null, closedAt: null,
    tags: ["bug", "hiring-plans"], createdAt: "2026-03-25T14:00:00Z", updatedAt: "2026-03-25T14:00:00Z",
    organization: { id: "org-005", name: "TechVista Solutions", industry: "Technology" },
    assignee: null,
    _count: { notes: 0, escalations: 0 },
    notes: [],
    escalations: [],
  },
];

// ── Support Analytics ─────────────────────────────────────────
export const SUPPORT_ANALYTICS = {
  ticketVolume: {
    trend: [
      { month: "2025-10", count: 3 }, { month: "2025-11", count: 5 }, { month: "2025-12", count: 8 },
      { month: "2026-01", count: 6 }, { month: "2026-02", count: 10 }, { month: "2026-03", count: 12 },
    ],
    byCategory: [
      { category: "TECHNICAL", count: 12 }, { category: "BUG_REPORT", count: 8 },
      { category: "FEATURE_REQUEST", count: 6 }, { category: "BILLING", count: 4 },
      { category: "ONBOARDING", count: 10 }, { category: "GENERAL", count: 4 },
    ],
    byPriority: [
      { priority: "CRITICAL", count: 5 }, { priority: "HIGH", count: 12 },
      { priority: "MEDIUM", count: 18 }, { priority: "LOW", count: 9 },
    ],
    total: 44,
  },
  responseTime: [
    { group: "CRITICAL", avgResponseHours: 1, avgResolutionHours: 6, ticketCount: 5 },
    { group: "HIGH", avgResponseHours: 3, avgResolutionHours: 12, ticketCount: 12 },
    { group: "MEDIUM", avgResponseHours: 8, avgResolutionHours: 28, ticketCount: 18 },
    { group: "LOW", avgResponseHours: 18, avgResolutionHours: 52, ticketCount: 9 },
  ],
  slaCompliance: {
    overall: { met: 36, breached: 8, total: 44, complianceRate: 82 },
    byPriority: [
      { priority: "CRITICAL", met: 3, breached: 2, total: 5, complianceRate: 60 },
      { priority: "HIGH", met: 9, breached: 3, total: 12, complianceRate: 75 },
      { priority: "MEDIUM", met: 15, breached: 3, total: 18, complianceRate: 83 },
      { priority: "LOW", met: 9, breached: 0, total: 9, complianceRate: 100 },
    ],
  },
  repPerformance: [
    { id: "sup-001", name: "Ravi Support", email: "ravi@worknucleus.com", totalTickets: 28, resolvedTickets: 22, resolutionRate: 79, avgResponseHours: 4 },
    { id: "sup-002", name: "Meera Support Admin", email: "meera@worknucleus.com", totalTickets: 16, resolvedTickets: 14, resolutionRate: 88, avgResponseHours: 2 },
  ],
};

// ── Support Sessions ──────────────────────────────────────────
export const SUPPORT_SESSIONS = [
  {
    id: "sess-001", sessionType: "SHADOW", reason: "Investigating login issues reported by Acme",
    startedAt: "2026-03-25T10:00:00Z", endedAt: "2026-03-25T10:30:00Z", ipAddress: "10.0.0.1",
    supportUser: { id: "sup-001", name: "Ravi Support" },
    targetOrg: { id: "org-001", name: "Acme Technologies" },
    targetUser: { id: "usr-001", name: "Priya Sharma" },
  },
  {
    id: "sess-002", sessionType: "SHADOW", reason: "Checking analytics dashboard for Nova Financial",
    startedAt: "2026-03-24T14:00:00Z", endedAt: "2026-03-24T14:45:00Z", ipAddress: "10.0.0.1",
    supportUser: { id: "sup-001", name: "Ravi Support" },
    targetOrg: { id: "org-003", name: "Nova Financial" },
    targetUser: null,
  },
  {
    id: "sess-003", sessionType: "IMPERSONATE", reason: "Testing pipeline stage creation for TechVista",
    startedAt: "2026-03-25T15:00:00Z", endedAt: null, ipAddress: "10.0.0.2",
    supportUser: { id: "sup-002", name: "Meera Support Admin" },
    targetOrg: { id: "org-005", name: "TechVista Solutions" },
    targetUser: { id: "usr-tv1", name: "Admin User" },
  },
];

// ── Feature Flags ─────────────────────────────────────────────
export const FEATURE_FLAGS: Record<string, Record<string, boolean>> = {
  "org-001": { aiJdGeneration: true, aiInsights: true, advancedAnalytics: true, bulkCandidateImport: false, customPipelineStages: true, emailNotifications: true, slackIntegration: false, apiAccess: true },
  "org-002": { aiJdGeneration: true, aiInsights: false, advancedAnalytics: true, bulkCandidateImport: false, customPipelineStages: true, emailNotifications: true, slackIntegration: false, apiAccess: false },
  "org-003": { aiJdGeneration: true, aiInsights: true, advancedAnalytics: false, bulkCandidateImport: false, customPipelineStages: false, emailNotifications: true, slackIntegration: false, apiAccess: false },
  "org-004": { aiJdGeneration: true, aiInsights: true, advancedAnalytics: true, bulkCandidateImport: true, customPipelineStages: true, emailNotifications: true, slackIntegration: true, apiAccess: true },
  "org-005": { aiJdGeneration: false, aiInsights: false, advancedAnalytics: false, bulkCandidateImport: false, customPipelineStages: false, emailNotifications: true, slackIntegration: false, apiAccess: false },
};
