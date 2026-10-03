import { Test, TestingModule } from '@nestjs/testing';
import { ClaimScopeService } from './claim-scope.service';

describe('ClaimScopeService', () => {
  let service: ClaimScopeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClaimScopeService],
    }).compile();

    service = module.get<ClaimScopeService>(ClaimScopeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
