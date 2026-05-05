import { Global, Module } from '@nestjs/common';
import { Msg91Client } from './msg91.client';

@Global()
@Module({
  providers: [Msg91Client],
  exports: [Msg91Client],
})
export class Msg91Module {}
