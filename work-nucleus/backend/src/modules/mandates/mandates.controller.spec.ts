import { Test, TestingModule } from '@nestjs/testing';
import { MandatesController } from './mandates.controller';

describe('MandatesController', () => {
  let controller: MandatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MandatesController],
    }).compile();

    controller = module.get<MandatesController>(MandatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
