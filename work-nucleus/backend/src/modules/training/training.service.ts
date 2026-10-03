import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTrainingModuleDto, UpdateTrainingModuleDto } from './dto/training.dto';
import { TrainingCategory } from '@prisma/client';

@Injectable()
export class TrainingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, dto: CreateTrainingModuleDto) {
    return this.prisma.trainingModule.create({
      data: { ...dto, orgId },
    });
  }

  async findAll(orgId: string, userId: string) {
    const modules = await this.prisma.trainingModule.findMany({
      where: { orgId },
      include: {
        completions: { where: { userId }, select: { completedAt: true } },
        _count: { select: { completions: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return modules.map((m) => ({
      id: m.id,
      title: m.title,
      category: m.category,
      isDefault: m.isDefault,
      estimatedMinutes: m.estimatedMinutes,
      createdAt: m.createdAt,
      completed: m.completions.length > 0,
      completedAt: m.completions[0]?.completedAt || null,
      totalCompletions: m._count.completions,
    }));
  }

  async findOne(id: string) {
    const module = await this.prisma.trainingModule.findUnique({
      where: { id },
    });
    if (!module) throw new NotFoundException('Training module not found');
    return module;
  }

  async update(id: string, dto: UpdateTrainingModuleDto) {
    await this.findOne(id);
    return this.prisma.trainingModule.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.trainingModule.delete({ where: { id } });
  }

  async markComplete(moduleId: string, userId: string) {
    await this.findOne(moduleId);
    return this.prisma.trainingCompletion.upsert({
      where: { userId_moduleId: { userId, moduleId } },
      create: { userId, moduleId },
      update: { completedAt: new Date() },
    });
  }

  async getProgress(orgId: string, userId: string) {
    const [total, completed] = await Promise.all([
      this.prisma.trainingModule.count({ where: { orgId } }),
      this.prisma.trainingCompletion.count({
        where: { userId, module: { orgId } },
      }),
    ]);
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }

  async seedDefaults(orgId: string) {
    const existing = await this.prisma.trainingModule.count({
      where: { orgId, isDefault: true },
    });
    if (existing > 0) return { message: 'Default modules already exist' };

    const defaults = [
      {
        title: 'Understanding Job Descriptions',
        category: TrainingCategory.JD_FORMAT,
        estimatedMinutes: 15,
        contentMarkdown: `# Understanding Job Descriptions

## Why Job Descriptions Matter
A well-crafted job description (JD) is the foundation of an effective hiring process. It attracts the right candidates, sets clear expectations, and serves as a benchmark for evaluation.

## Key Components

### 1. Role Summary
- Clear, concise overview of the position
- Primary purpose and impact of the role
- Reporting structure

### 2. Responsibilities
- List 6-10 key responsibilities
- Use action verbs (Lead, Develop, Manage, Design)
- Prioritize from most to least important

### 3. Qualifications
- **Required**: Must-have skills and experience
- **Preferred**: Nice-to-have qualifications
- Be specific: "5+ years in Node.js" vs "experienced developer"

### 4. Compensation & Benefits
- Be transparent about salary ranges
- List key benefits (health, equity, flexibility)
- Include growth opportunities

## Best Practices
- Avoid jargon and gendered language
- Focus on outcomes over tasks
- Keep it under 800 words
- Review with the hiring manager before publishing

## Using AI-Generated JDs
QuestEdge generates JDs based on your hiring plan data. Always review and customize:
1. Verify technical requirements match actual needs
2. Adjust tone to match company culture
3. Add team-specific details the AI may not know`,
      },
      {
        title: 'Effective Interviewing Skills',
        category: TrainingCategory.INTERVIEWING_SKILLS,
        estimatedMinutes: 25,
        contentMarkdown: `# Effective Interviewing Skills

## The STAR Method
Use **Situation, Task, Action, Result** to structure behavioral questions:

### Example Questions
- "Tell me about a time you had to meet a tight deadline" (STAR: What was the situation? What was your task? What action did you take? What was the result?)
- "Describe a conflict with a colleague and how you resolved it"
- "Give an example of when you had to learn something quickly"

## Interview Structure

### 1. Opening (5 min)
- Welcome and introduce yourself
- Explain the interview format and duration
- Put the candidate at ease

### 2. Background (10 min)
- Walk through their experience
- Understand career motivations
- Verify key resume claims

### 3. Technical/Role Assessment (20-30 min)
- Role-specific questions
- Problem-solving scenarios
- Skill-specific evaluation

### 4. Behavioral Questions (15 min)
- Use STAR method
- Focus on competencies relevant to the role
- Look for patterns across examples

### 5. Candidate Questions (10 min)
- Allow genuine questions
- Be honest and transparent
- Sell the opportunity appropriately

## Bias Awareness

### Common Biases to Watch For
- **Halo Effect**: One positive trait influences entire evaluation
- **Confirmation Bias**: Seeking information that confirms first impression
- **Similarity Bias**: Favoring candidates similar to yourself
- **Recency Bias**: Overweighting recent answers

### Mitigation Strategies
- Use structured scorecards for every interview
- Rate each competency independently
- Take notes during the interview
- Discuss with other interviewers before forming final opinion
- Focus on evidence, not feelings`,
      },
      {
        title: 'How to Give and Record Feedback',
        category: TrainingCategory.FEEDBACK_GUIDELINES,
        estimatedMinutes: 15,
        contentMarkdown: `# How to Give and Record Feedback

## Why Structured Feedback Matters
- Enables fair, consistent evaluation
- Creates an audit trail for decisions
- Helps identify patterns across interviewers
- Supports AI-powered summarization

## Skill Ratings (1-5 Scale)

| Rating | Meaning | When to Use |
|--------|---------|-------------|
| 1 - Poor | Significantly below expectations | Fundamental gaps in required skill |
| 2 - Below Average | Below expected level | Some knowledge but insufficient |
| 3 - Average | Meets basic expectations | Adequate for the role |
| 4 - Good | Above expectations | Strong competency demonstrated |
| 5 - Excellent | Exceptional | Outstanding, exceeds all expectations |

## Writing Effective Notes

### Do
- Be specific: "Explained microservices architecture clearly with examples"
- Cite evidence: "Solved the system design problem in 20 minutes"
- Note both positives and negatives
- Rate each skill independently

### Don't
- Be vague: "Seemed smart" or "Good candidate"
- Use personal judgments: "Not a culture fit" without specifics
- Compare to other candidates in notes
- Leave fields empty

## Recommendation Guide
- **Strong Yes**: Would champion this hire. Clear evidence across all areas
- **Yes**: Good candidate, minor gaps. Would support hiring
- **Neutral**: Mixed signals. Neither strongly for nor against
- **No**: Significant gaps identified. Would not recommend
- **Strong No**: Clear deal-breakers identified

## Submitting Feedback
1. Save drafts frequently (auto-saves every 30s)
2. Complete all skill ratings before submitting
3. Review your notes for clarity
4. Submit within 24 hours of the interview`,
      },
      {
        title: 'QuestEdge Hiring Process Overview',
        category: TrainingCategory.HIRING_PROCESS,
        estimatedMinutes: 20,
        contentMarkdown: `# QuestEdge Hiring Process Overview

## The Hiring Pipeline

### Step 1: Create a Hiring Plan
- Define role, department, budget, and timeline
- Set required skills and proficiency levels
- Assign hiring manager

### Step 2: Generate Job Description
- AI generates structured JD from hiring plan data
- Review and customize the content
- Get approval from stakeholders
- Publish to job boards

### Step 3: Set Up Pipeline
- Configure interview stages (Screening, Technical, HR, etc.)
- Assign interviewers to each stage
- Set duration expectations

### Step 4: Add Candidates
- Add candidates from various sources
- Candidates enter the first pipeline stage
- Track progress on the Kanban board

### Step 5: Conduct Interviews
- Use the feedback form for structured evaluation
- Rate skills, give recommendation
- Submit feedback after each interview

### Step 6: AI-Powered Assessment
- Generate AI summary from all feedback
- Calculate weighted candidate score
- Review skill matrix across interviewers

### Step 7: Make Decision
- Select or reject candidate
- AI drafts professional communication
- Review and send offer/rejection email

## Roles & Permissions
- **Admin**: Full access to all features
- **HR**: Manage plans, candidates, decisions
- **Hiring Manager**: Manage assigned plans, view all feedback
- **Interviewer**: Submit feedback for assigned stages
- **Viewer**: Read-only access

## Dashboard
Track key metrics:
- Active hiring plans
- Open roles vs filled roles
- Pipeline health
- Time-to-hire metrics`,
      },
    ];

    await this.prisma.trainingModule.createMany({
      data: defaults.map((d) => ({
        orgId,
        title: d.title,
        contentMarkdown: d.contentMarkdown,
        category: d.category,
        isDefault: true,
        estimatedMinutes: d.estimatedMinutes,
      })),
    });

    return { message: 'Default training modules created', count: defaults.length };
  }
}
