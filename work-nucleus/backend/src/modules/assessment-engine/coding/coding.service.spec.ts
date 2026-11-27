import { ServiceUnavailableException } from '@nestjs/common';
import { CodingService } from './coding.service';

describe('CodingService Judge0 gating', () => {
  it('reports execution disabled and rejects runCode/submitCode when JUDGE0_API_KEY is missing', async () => {
    const prisma: any = {
      assessmentAttempt: { findFirst: jest.fn() },
    };
    const config: any = {
      get: jest.fn((key: string, def?: string) => {
        if (key === 'JUDGE0_API_KEY') return '';
        return def;
      }),
    };
    const svc = new CodingService(prisma, config);

    expect(svc.isExecutionEnabled()).toBe(false);
    await expect(
      svc.runCode('tok-1', {
        challengeId: 'ch-1',
        sourceCode: 'print(1)',
        language: 'python',
        languageId: 71,
      }),
    ).rejects.toThrow(ServiceUnavailableException);
    await expect(
      svc.submitCode('tok-1', {
        challengeId: 'ch-1',
        sourceCode: 'print(1)',
        language: 'python',
        languageId: 71,
      }),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(prisma.assessmentAttempt.findFirst).not.toHaveBeenCalled();
  });

  it('reports execution enabled when JUDGE0_API_KEY is configured', () => {
    const svc = new CodingService(
      {} as any,
      {
        get: jest.fn((key: string, def?: string) =>
          key === 'JUDGE0_API_KEY' ? 'judge0-live-key' : def,
        ),
      } as any,
    );
    expect(svc.isExecutionEnabled()).toBe(true);
  });
});
