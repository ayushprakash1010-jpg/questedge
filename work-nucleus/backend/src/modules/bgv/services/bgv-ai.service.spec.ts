import { Test, TestingModule } from '@nestjs/testing';
import { BgvAiService } from './bgv-ai.service';
import { ConfigService } from '@nestjs/config';

describe('BgvAiService', () => {
  let service: BgvAiService;
  let config: any;

  beforeEach(async () => {
    config = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'GEMINI_API_KEY') return null; // Default to null for fallback tests
        if (key === 'NODE_ENV') return 'test';
        if (key === 'GEMINI_MODEL') return 'gemini-flash-latest';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BgvAiService,
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<BgvAiService>(BgvAiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fallback', () => {
    it('should recommend PROCEED when there are 0 discrepancies', () => {
      const result = service.fallback([
        { finding: 'CLEAR' },
        { finding: 'VERIFIED' },
      ]);
      expect(result.overall_recommendation).toBe('PROCEED');
      expect(result.discrepancies).toEqual([]);
    });

    it('should recommend PROCEED_WITH_CAUTION when there are 1 or 2 discrepancies', () => {
      const result = service.fallback([
        { finding: 'DISCREPANCY' },
        { finding: 'VERIFIED' },
      ]);
      expect(result.overall_recommendation).toBe('PROCEED_WITH_CAUTION');

      const result2 = service.fallback([
        { finding: 'DISCREPANCY' },
        { finding: 'DISCREPANCY' },
      ]);
      expect(result2.overall_recommendation).toBe('PROCEED_WITH_CAUTION');
    });

    it('should recommend BLOCK when there are more than 2 discrepancies', () => {
      const result = service.fallback([
        { finding: 'DISCREPANCY' },
        { finding: 'DISCREPANCY' },
        { finding: 'DISCREPANCY' },
      ]);
      expect(result.overall_recommendation).toBe('BLOCK');
    });

    it('should handle empty checks array without error', () => {
      const result = service.fallback([]);
      expect(result.overall_recommendation).toBe('PROCEED');
      expect(result.key_findings).toBeDefined();
    });
  });

  describe('summarise without GEMINI_API_KEY', () => {
    it('should immediately use fallback logic when api key is missing', async () => {
      const payload = {
        candidate: { name: 'Alice Smith', email: 'alice@example.com' },
        profile: { riskScore: 'GREEN', vendor: 'AUTHBRIDGE' },
        checks: [
          {
            type: 'IDENTITY',
            status: 'COMPLETED',
            finding: 'CLEAR',
          },
        ],
      };

      const result = await service.summarise(payload);
      expect(result).toBeDefined();
      expect(result.overall_recommendation).toBe('PROCEED');
      expect(result.executive_summary).toContain('AI summariser unavailable');
    });
  });
});
