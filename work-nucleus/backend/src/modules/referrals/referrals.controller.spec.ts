import { Test, TestingModule } from '@nestjs/testing';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';

describe('ReferralsController', () => {
  let controller: ReferralsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferralsController],
      providers: [
        {
          provide: ReferralsService,
          useValue: {
            createReferral: jest.fn(),
            getMyReferrals: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ReferralsController>(ReferralsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
