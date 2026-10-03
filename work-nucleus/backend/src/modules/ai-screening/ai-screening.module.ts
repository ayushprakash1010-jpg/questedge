import { Module } from '@nestjs/common';
import { AiScreeningService } from './ai-screening.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AiScreeningService],
  exports: [AiScreeningService],
})
export class AiScreeningModule {}
