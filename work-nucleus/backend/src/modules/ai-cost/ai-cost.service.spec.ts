import { AiCostService } from './ai-cost.service';

describe('AiCostService.logGeminiCall', () => {
  const mockPrisma = {
    aiCallLog: {
      create: jest.fn(),
    },
  };

  let service: AiCostService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AiCostService(mockPrisma as any);
  });

  it('logs token counts, cost in paise, and SUCCESS status from Gemini usageMetadata', async () => {
    mockPrisma.aiCallLog.create.mockResolvedValue({ id: 'log-1' });

    await service.logGeminiCall({
      orgId: 'org-1',
      agentName: 'reports.nl_draft',
      modelUsed: 'gemini-flash-latest',
      startedAtMs: Date.now() - 25,
      response: {
        usageMetadata: {
          promptTokenCount: 2000,
          candidatesTokenCount: 500,
        },
      },
    });

    expect(mockPrisma.aiCallLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orgId: 'org-1',
        agentName: 'reports.nl_draft',
        modelUsed: 'gemini-flash-latest',
        tokensInput: 2000,
        tokensOutput: 500,
        costInPaise: 4,
        cacheHit: false,
        status: 'SUCCESS',
      }),
    });
  });

  it('records zero costInPaise on cache hits', async () => {
    mockPrisma.aiCallLog.create.mockResolvedValue({ id: 'log-2' });

    await service.logGeminiCall({
      orgId: 'org-1',
      agentName: 'ai_matching.evaluate',
      modelUsed: 'gemini-flash-lite-latest',
      startedAtMs: Date.now(),
      cacheHit: true,
    });

    expect(mockPrisma.aiCallLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cacheHit: true,
        costInPaise: 0,
        status: 'SUCCESS',
      }),
    });
  });

  it('records ERROR status with zero cost when Gemini fails without usage', async () => {
    mockPrisma.aiCallLog.create.mockResolvedValue({ id: 'log-3' });

    await service.logGeminiCall({
      orgId: 'org-1',
      agentName: 'jd.generate',
      modelUsed: 'gemini-flash-latest',
      startedAtMs: Date.now(),
      error: new Error('Rate limited'),
    });

    expect(mockPrisma.aiCallLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        costInPaise: 0,
        status: 'ERROR',
      }),
    });
  });

  it('never throws when telemetry persistence fails', async () => {
    mockPrisma.aiCallLog.create.mockRejectedValue(new Error('DB down'));

    await expect(
      service.logGeminiCall({
        orgId: 'org-1',
        agentName: 'bgv.summarise',
        modelUsed: 'gemini-flash-latest',
        startedAtMs: Date.now(),
      }),
    ).resolves.toBeUndefined();
  });
});
