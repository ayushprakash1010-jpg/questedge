import { Global, Module } from '@nestjs/common';
import { HotCacheService } from './cache.service';

@Global()
@Module({
  providers: [HotCacheService],
  exports: [HotCacheService],
})
export class HotCacheModule {}
