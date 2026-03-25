import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { SearchSkillsDto } from './dto/search-skills.dto';
import { CreateSkillDto } from './dto/create-skill.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Skills')
@ApiBearerAuth()
@Controller('api/v1')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get('skills/search')
  @ApiOperation({ summary: 'Search skills by name, category, or industry' })
  search(@Query() query: SearchSkillsDto) {
    return this.skillsService.search(query);
  }

  @Get('admin/skills')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all skills (admin)' })
  findAll() {
    return this.skillsService.findAll();
  }

  @Post('admin/skills')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a skill (admin)' })
  create(@Body() dto: CreateSkillDto) {
    return this.skillsService.create(dto);
  }

  @Patch('admin/skills/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a skill (admin)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateSkillDto) {
    return this.skillsService.update(id, dto);
  }

  @Delete('admin/skills/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a skill (admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.skillsService.remove(id);
  }
}
