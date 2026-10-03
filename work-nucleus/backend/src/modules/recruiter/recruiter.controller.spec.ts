import { Test, TestingModule } from '@nestjs/testing';
import { RecruiterController } from './recruiter.controller';

describe('RecruiterController', () => {
  let controller: RecruiterController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecruiterController],
    }).compile();

    controller = module.get<RecruiterController>(RecruiterController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
