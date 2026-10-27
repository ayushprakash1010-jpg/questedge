import { Test, TestingModule } from '@nestjs/testing';
import { MandatesController } from './mandates.controller';
import { MandatesService } from './mandates.service';
import { AiScreeningService } from '../ai-screening/ai-screening.service';
import { WhatsappService } from '../notifications/whatsapp.service';

describe('MandatesController', () => {
  let controller: MandatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MandatesController],
      providers: [
        {
          provide: MandatesService,
          useValue: {
            create: jest.fn(),
            findByOrg: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: AiScreeningService,
          useValue: {
            generateMandate: jest.fn(),
          },
        },
        {
          provide: WhatsappService,
          useValue: {
            sendNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MandatesController>(MandatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
