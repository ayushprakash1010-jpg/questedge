import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserTypes } from '../../auth/decorators/user-types.decorator';
import { UserType } from '@prisma/client';
import { CreateTicketDto } from './dto/create-ticket.dto';

@ApiTags('User Support Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/user/support/tickets')
export class UserTicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @UserTypes(
    UserType.COMPANY_ADMIN,
    UserType.COMPANY_USER,
    UserType.RECRUITER,
    UserType.CANDIDATE,
  )
  @ApiOperation({ summary: 'Create a support ticket as a user' })
  async createTicket(@Body() dto: CreateTicketDto, @Req() req: any) {
    let orgId = req.user.orgId;
    if (!orgId) {
      const platformOrg = await this.prisma.organization.findFirst({
        where: { name: 'QuestEdge Platform' },
      });
      orgId = platformOrg?.id;
      if (!orgId) {
        const anyOrg = await this.prisma.organization.findFirst();
        orgId = anyOrg?.id;
      }
    }
    dto.orgId = orgId;
    dto.reportedBy = req.user.email || req.user.id || req.user.name || 'client';
    return this.ticketsService.createTicket(dto, req.user.id);
  }

  @Get()
  @UserTypes(
    UserType.COMPANY_ADMIN,
    UserType.COMPANY_USER,
    UserType.RECRUITER,
    UserType.CANDIDATE,
  )
  @ApiOperation({ summary: 'List my support tickets' })
  listTickets(@Req() req: any) {
    const isCompanyAdmin =
      req.user.userType === UserType.COMPANY_ADMIN || req.user.role === 'ADMIN';

    if (isCompanyAdmin && req.user.orgId) {
      return this.ticketsService.listTickets({
        page: 1,
        limit: 50,
        orgId: req.user.orgId,
      });
    }

    return this.ticketsService.listTickets({
      page: 1,
      limit: 50,
      reportedBy: req.user.email || req.user.id,
    });
  }
}
