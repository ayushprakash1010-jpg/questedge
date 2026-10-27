import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { UserTypes } from '../../auth/decorators/user-types.decorator';
import { UserType } from '@prisma/client';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('api/v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER)
  @ApiOperation({ summary: 'Global search across candidates, plans, JDs' })
  search(@Req() req: any, @Query('q') q: string) {
    return this.searchService.search(req.user.orgId, q);
  }
}
