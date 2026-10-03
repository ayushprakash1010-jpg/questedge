import { Test, TestingModule } from '@nestjs/testing';
import { CandidatePortalController } from './candidate-portal.controller';

describe('CandidatePortalController', () => {
  let controller: CandidatePortalController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandidatePortalController],
    }).compile();

    controller = module.get<CandidatePortalController>(CandidatePortalController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
