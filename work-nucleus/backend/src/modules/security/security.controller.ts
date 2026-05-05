import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SecurityService } from './security.service';

@ApiTags('Security (v2)')
@ApiBearerAuth()
@Controller('api/v2/security')
@Roles(Role.ADMIN)
export class SecurityController {
  constructor(private readonly service: SecurityService) {}

  @Get('verify-chain')
  @ApiOperation({ summary: 'Verify the security log hash chain' })
  verify(@CurrentUser('orgId') orgId: string) {
    return this.service.verifyChain(orgId);
  }

  @Get('access-review')
  @ApiOperation({ summary: 'Access review export (users + roles + active flag)' })
  review(@CurrentUser('orgId') orgId: string) {
    return this.service.accessReviewExport(orgId);
  }
}
