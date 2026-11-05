import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCodingChallengeDto, RunCodeDto, SubmitCodeDto } from '../dto';

interface Judge0Result {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
}

// Common Judge0 language IDs
export const LANGUAGE_MAP: Record<string, number> = {
  python: 71,    // Python 3.8.1
  javascript: 63, // Node.js 12.14.0
  java: 62,       // Java 13.0.1
  cpp: 54,        // C++ 17 (GCC 9.2.0)
  c: 50,          // C (GCC 9.2.0)
  typescript: 74,  // TypeScript 3.7.4
  ruby: 72,        // Ruby 2.7.0
  go: 60,          // Go 1.13.5
  rust: 73,        // Rust 1.40.0
  csharp: 51,      // C# Mono 6.6.0
};

@Injectable()
export class CodingService {
  private readonly logger = new Logger(CodingService.name);
  private readonly judge0Url: string;
  private readonly judge0ApiKey: string;
  private readonly judge0Host: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.judge0Url = this.config.get<string>('JUDGE0_API_URL', 'https://judge0-ce.p.rapidapi.com');
    this.judge0ApiKey = this.config.get<string>('JUDGE0_API_KEY', '');
    this.judge0Host = this.config.get<string>('JUDGE0_API_HOST', 'judge0-ce.p.rapidapi.com');
  }

  // ── Challenge CRUD ────────────────────────────────────────────

  async addChallenge(assessmentId: string, dto: CreateCodingChallengeDto, orgId: string) {
    const assessment = await this.prisma.hiringAssessment.findFirst({
      where: { id: assessmentId, orgId, type: 'CODING' },
    });
    if (!assessment) throw new NotFoundException('Coding assessment not found');

    return this.prisma.codingChallenge.create({
      data: {
        assessmentId,
        title: dto.title,
        description: dto.description,
        constraints: dto.constraints,
        sampleTestCases: dto.sampleTestCases,
        hiddenTestCases: dto.hiddenTestCases,
        supportedLanguages: dto.supportedLanguages ?? ['python', 'javascript', 'java', 'cpp'],
        starterCode: dto.starterCode ?? {},
        difficulty: dto.difficulty ?? 'MEDIUM',
        maxScore: dto.maxScore ?? 100,
        timeLimitSeconds: dto.timeLimitSeconds ?? 5,
        orderIndex: dto.orderIndex ?? 0,
      },
    });
  }

  async updateChallenge(
    assessmentId: string,
    challengeId: string,
    dto: Partial<CreateCodingChallengeDto>,
    orgId: string,
  ) {
    const challenge = await this.prisma.codingChallenge.findFirst({
      where: {
        id: challengeId,
        assessmentId,
        assessment: { orgId },
      },
    });
    if (!challenge) throw new NotFoundException('Coding challenge not found');

    return this.prisma.codingChallenge.update({
      where: { id: challengeId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.constraints !== undefined && { constraints: dto.constraints }),
        ...(dto.sampleTestCases !== undefined && { sampleTestCases: dto.sampleTestCases }),
        ...(dto.hiddenTestCases !== undefined && { hiddenTestCases: dto.hiddenTestCases }),
        ...(dto.supportedLanguages !== undefined && { supportedLanguages: dto.supportedLanguages }),
        ...(dto.starterCode !== undefined && { starterCode: dto.starterCode }),
        ...(dto.difficulty !== undefined && { difficulty: dto.difficulty }),
        ...(dto.maxScore !== undefined && { maxScore: dto.maxScore }),
        ...(dto.timeLimitSeconds !== undefined && { timeLimitSeconds: dto.timeLimitSeconds }),
        ...(dto.orderIndex !== undefined && { orderIndex: dto.orderIndex }),
      },
    });
  }

  async removeChallenge(assessmentId: string, challengeId: string, orgId: string) {
    const challenge = await this.prisma.codingChallenge.findFirst({
      where: { id: challengeId, assessmentId, assessment: { orgId } },
    });
    if (!challenge) throw new NotFoundException('Coding challenge not found');

    await this.prisma.codingChallenge.delete({ where: { id: challengeId } });
  }

  // ── Code Execution (Judge0) ───────────────────────────────────

  async runCode(token: string, dto: RunCodeDto) {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { accessToken: token, status: { in: ['NOT_STARTED', 'IN_PROGRESS'] } },
    });
    if (!attempt) throw new BadRequestException('No active attempt found');
    if (attempt.status === 'NOT_STARTED') {
      await this.prisma.assessmentAttempt.update({
        where: { id: attempt.id },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      });
    }

    const challenge = await this.prisma.codingChallenge.findFirst({
      where: { id: dto.challengeId },
    });
    if (!challenge) throw new NotFoundException('Challenge not found');

    // Run against sample test cases only
    const sampleTests = challenge.sampleTestCases as Array<{
      id: string;
      input: string;
      expectedOutput: string;
    }>;

    const results = await this.executeAgainstTestCases(
      dto.sourceCode,
      dto.languageId,
      sampleTests,
      challenge.timeLimitSeconds,
    );

    // Save as non-final submission
    await this.prisma.codeSubmission.create({
      data: {
        attemptId: attempt.id,
        challengeId: dto.challengeId,
        sourceCode: dto.sourceCode,
        language: dto.language,
        languageId: dto.languageId,
        status: results.every((r) => r.passed) ? 'PASSED' : 'PARTIAL',
        testCasesPassed: results.filter((r) => r.passed).length,
        totalTestCases: results.length,
        score: 0,
        testCaseResults: results,
        isFinalSubmit: false,
      },
    });

    return {
      testCases: results,
      passed: results.filter((r) => r.passed).length,
      total: results.length,
    };
  }

  async submitCode(token: string, dto: SubmitCodeDto) {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { accessToken: token, status: { in: ['NOT_STARTED', 'IN_PROGRESS'] } },
    });
    if (!attempt) throw new BadRequestException('No active attempt found');
    if (attempt.status === 'NOT_STARTED') {
      await this.prisma.assessmentAttempt.update({
        where: { id: attempt.id },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      });
    }

    const challenge = await this.prisma.codingChallenge.findFirst({
      where: { id: dto.challengeId },
    });
    if (!challenge) throw new NotFoundException('Challenge not found');

    // Run against ALL test cases (sample + hidden)
    const sampleTests = challenge.sampleTestCases as Array<{
      id: string; input: string; expectedOutput: string;
    }>;
    const hiddenTests = challenge.hiddenTestCases as Array<{
      id: string; input: string; expectedOutput: string; points: number;
    }>;
    const allTests = [...sampleTests, ...hiddenTests];

    const results = await this.executeAgainstTestCases(
      dto.sourceCode,
      dto.languageId,
      allTests,
      challenge.timeLimitSeconds,
    );

    // Calculate score based on hidden test cases
    let score = 0;
    const hiddenResults = results.slice(sampleTests.length);
    hiddenResults.forEach((result, idx) => {
      if (result.passed && hiddenTests[idx]) {
        score += hiddenTests[idx].points;
      }
    });

    const totalPassed = results.filter((r) => r.passed).length;
    const allPassed = totalPassed === allTests.length;
    const status = allPassed ? 'PASSED' : totalPassed > 0 ? 'PARTIAL' : 'FAILED';

    const submission = await this.prisma.codeSubmission.create({
      data: {
        attemptId: attempt.id,
        challengeId: dto.challengeId,
        sourceCode: dto.sourceCode,
        language: dto.language,
        languageId: dto.languageId,
        status,
        testCasesPassed: totalPassed,
        totalTestCases: allTests.length,
        score,
        executionTimeMs: results.reduce((sum, r) => sum + (r.time || 0), 0),
        memoryUsedKb: Math.max(...results.map((r) => r.memory || 0)),
        testCaseResults: results,
        isFinalSubmit: true,
      },
    });

    // Update attempt score (sum of all final submissions for this attempt)
    const allFinalSubmissions = await this.prisma.codeSubmission.findMany({
      where: { attemptId: attempt.id, isFinalSubmit: true },
    });
    const totalScore = allFinalSubmissions.reduce((sum, s) => sum + s.score, 0);
    const totalMaxScore = await this.prisma.codingChallenge.aggregate({
      where: { assessmentId: attempt.assessmentId },
      _sum: { maxScore: true },
    });
    const maxScore = totalMaxScore._sum.maxScore || 100;
    const percentage = (totalScore / maxScore) * 100;

    await this.prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: { score: totalScore, percentage },
    });

    return {
      submissionId: submission.id,
      status,
      score,
      maxScore: challenge.maxScore,
      testCasesPassed: totalPassed,
      totalTestCases: allTests.length,
      // Only show sample test case details, hide hidden test results
      sampleResults: results.slice(0, sampleTests.length),
      hiddenPassed: hiddenResults.filter((r) => r.passed).length,
      hiddenTotal: hiddenTests.length,
    };
  }

  async completeCodeAssessment(token: string) {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { accessToken: token, status: { in: ['NOT_STARTED', 'IN_PROGRESS'] } },
      include: { assessment: true },
    });
    if (!attempt) throw new BadRequestException('No active attempt found');

    const percentage = Number(attempt.percentage);
    const passed = percentage >= attempt.assessment.passingPercentage;

    return this.prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'COMPLETED',
        startedAt: attempt.startedAt || new Date(),
        completedAt: new Date(),
        passed,
      },
    });
  }

  // ── Judge0 API Integration ────────────────────────────────────

  private async executeAgainstTestCases(
    sourceCode: string,
    languageId: number,
    testCases: Array<{ id: string; input: string; expectedOutput: string }>,
    timeLimitSeconds: number,
  ) {
    const results = [];

    for (const tc of testCases) {
      try {
        const result = await this.executeCode(sourceCode, languageId, tc.input, timeLimitSeconds);
        const actualOutput = (result.stdout || '').trim();
        const expectedOutput = tc.expectedOutput.trim();
        const passed = actualOutput === expectedOutput;

        results.push({
          testCaseId: tc.id,
          passed,
          actualOutput: actualOutput.substring(0, 1000), // Limit output size
          expectedOutput: expectedOutput.substring(0, 1000),
          time: result.time ? parseFloat(result.time) * 1000 : null, // Convert to ms
          memory: result.memory,
          error: result.stderr || result.compile_output || null,
          statusDescription: result.status.description,
        });
      } catch (error) {
        results.push({
          testCaseId: tc.id,
          passed: false,
          actualOutput: null,
          expectedOutput: tc.expectedOutput.trim(),
          time: null,
          memory: null,
          error: error.message || 'Execution failed',
          statusDescription: 'Internal Error',
        });
      }
    }

    return results;
  }

  private async executeCode(
    sourceCode: string,
    languageId: number,
    stdin: string,
    timeLimitSeconds: number,
  ): Promise<Judge0Result> {
    if (!this.judge0ApiKey) {
      throw new BadRequestException(
        'Code execution is not configured. Please set JUDGE0_API_KEY environment variable.',
      );
    }

    const payload = {
      source_code: Buffer.from(sourceCode).toString('base64'),
      language_id: languageId,
      stdin: Buffer.from(stdin).toString('base64'),
      cpu_time_limit: timeLimitSeconds,
      wall_time_limit: timeLimitSeconds * 2,
      memory_limit: 262144, // 256 MB
    };

    try {
      const response = await fetch(`${this.judge0Url}/submissions?base64_encoded=true&wait=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': this.judge0ApiKey,
          'X-RapidAPI-Host': this.judge0Host,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Judge0 API error: ${response.status} - ${errorText}`);
        throw new BadRequestException('Code execution service temporarily unavailable');
      }

      const result = await response.json();

      // Decode base64 outputs
      return {
        stdout: result.stdout ? Buffer.from(result.stdout, 'base64').toString() : null,
        stderr: result.stderr ? Buffer.from(result.stderr, 'base64').toString() : null,
        compile_output: result.compile_output
          ? Buffer.from(result.compile_output, 'base64').toString()
          : null,
        status: result.status,
        time: result.time,
        memory: result.memory,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Judge0 execution failed', error);
      throw new BadRequestException('Failed to execute code');
    }
  }
}

