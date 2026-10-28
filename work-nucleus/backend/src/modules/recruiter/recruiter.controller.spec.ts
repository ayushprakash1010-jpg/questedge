import { Test, TestingModule } from '@nestjs/testing';
import { RecruiterController } from './recruiter.controller';
import { RecruiterService } from './recruiter.service';

describe('RecruiterController', () => {
  let controller: RecruiterController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecruiterController],
      providers: [
        {
          provide: RecruiterService,
          useValue: {
            getProfile: jest.fn(),
            createProfile: jest.fn(),
            updateProfile: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RecruiterController>(RecruiterController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
