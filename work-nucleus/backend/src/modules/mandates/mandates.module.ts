import { Module } from '@nestjs/common';
import { MandatesService } from './mandates.service';
import { MandatesController } from './mandates.controller';
import { PrismaModule } from '../../prisma/prisma.module';

import { CommsModule } from '../comms/comms.module';
import { AiScreeningModule } from '../ai-screening/ai-screening.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, CommsModule, AiScreeningModule, NotificationsModule],
  controllers: [MandatesController],
  providers: [MandatesService],
  exports: [MandatesService],
})
export class MandatesModule {}
