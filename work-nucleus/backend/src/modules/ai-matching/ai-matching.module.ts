import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiMatchingService } from './ai-matching.service';
import { AiMatchingController } from './ai-matching.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [AiMatchingController],
  providers: [AiMatchingService],
  exports: [AiMatchingService],
})
export class AiMatchingModule {}
