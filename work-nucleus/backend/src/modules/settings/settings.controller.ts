import { Controller, Get, Patch, Body, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Settings')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('api/v1/admin/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get organization settings' })
  get(@Req() req: any) {
    return this.settingsService.get(req.user.orgId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update organization settings' })
  update(@Req() req: any, @Body() body: Record<string, any>) {
    return this.settingsService.update(req.user.orgId, body);
  }
}
