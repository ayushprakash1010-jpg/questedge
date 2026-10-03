import { Test, TestingModule } from '@nestjs/testing';
import { CandidatePortalService } from './candidate-portal.service';

describe('CandidatePortalService', () => {
  let service: CandidatePortalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CandidatePortalService],
    }).compile();

    service = module.get<CandidatePortalService>(CandidatePortalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
