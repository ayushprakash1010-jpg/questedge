import { Module } from '@nestjs/common';
import { ClaimScopeController } from './claim-scope.controller';
import { ClaimScopeService } from './claim-scope.service';

@Module({
  controllers: [ClaimScopeController],
  providers: [ClaimScopeService]
})
export class ClaimScopeModule {}
