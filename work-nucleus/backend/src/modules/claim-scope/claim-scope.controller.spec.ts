import { Test, TestingModule } from '@nestjs/testing';
import { ClaimScopeController } from './claim-scope.controller';

describe('ClaimScopeController', () => {
  let controller: ClaimScopeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClaimScopeController],
    }).compile();

    controller = module.get<ClaimScopeController>(ClaimScopeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
