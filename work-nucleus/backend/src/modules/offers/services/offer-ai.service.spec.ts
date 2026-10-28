import { Test, TestingModule } from '@nestjs/testing';
import { OfferAiService } from './offer-ai.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';

describe('OfferAiService', () => {
  let service: OfferAiService;
  let prisma: any;
  let config: any;

  const mockOffer = {
    id: 'offer-1',
    organization: { name: 'Acme Corp' },
    compensation: {
      currency: 'INR',
      fixedAnnual: 1800000,
      variableAnnual: 200000,
      joiningBonus: 100000,
    },
    application: {
      candidate: { name: 'Jane Doe', email: 'jane@example.com' },
      hiringPlan: { designation: 'Senior Frontend Engineer', department: 'Engineering' },
    },
  };

  beforeEach(async () => {
    prisma = {
      offer: {
        findUnique: jest.fn(),
      },
    };

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
        OfferAiService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<OfferAiService>(OfferAiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw NotFoundException if offer is not found', async () => {
    prisma.offer.findUnique.mockResolvedValue(null);
    await expect(service.draftOfferBody('non-existent')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should return deterministic fallback when GEMINI_API_KEY is not configured', async () => {
    prisma.offer.findUnique.mockResolvedValue(mockOffer);

    const result = await service.draftOfferBody('offer-1', 'warm');
    expect(result).toBeDefined();
    expect(result.body).toContain('Dear Jane Doe');
    expect(result.body).toContain('Senior Frontend Engineer');
  });

  it('should provide a standard fallback method', () => {
    const fallback = service.fallback('John Smith', 'Product Manager');
    expect(fallback.body).toContain('Dear John Smith');
    expect(fallback.body).toContain('Product Manager');
  });
});
