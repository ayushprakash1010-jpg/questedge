import { Module } from '@nestjs/common';
import { PushController } from './push.controller';

@Module({
  controllers: [PushController],
})
export class PushModule {}
