import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
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
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER, UserType.RECRUITER, UserType.CANDIDATE)
  @ApiOperation({ summary: 'Create a support ticket as a user' })
  createTicket(@Body() dto: CreateTicketDto, @Req() req: any) {
    dto.orgId = req.user.orgId;
    dto.reportedBy = req.user.id;
    return this.ticketsService.createTicket(dto, req.user.id);
  }

  @Get()
  @UserTypes(UserType.COMPANY_ADMIN, UserType.COMPANY_USER, UserType.RECRUITER, UserType.CANDIDATE)
  @ApiOperation({ summary: 'List my support tickets' })
  listTickets(@Req() req: any) {
    // If not a company admin, maybe filter by reportedBy? Or let org admins see all org tickets.
    const orgId = req.user.orgId;
    return this.ticketsService.listTickets({
      page: 1,
      limit: 50,
      orgId,
      ...(req.user.userType !== UserType.COMPANY_ADMIN ? { reportedBy: req.user.id } : {})
    });
  }
}
