import {
  Controller, Get, Post, Patch, Param, Query, Body, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { EscalateTicketDto } from './dto/escalate-ticket.dto';

@ApiTags('Support Tickets')
@ApiBearerAuth()
@Roles(Role.SUPPORT_REP, Role.SUPPORT_ADMIN)
@Controller('api/v1/support/tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a support ticket' })
  createTicket(@Body() dto: CreateTicketDto, @Req() req: any) {
    return this.ticketsService.createTicket(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List support tickets with filters' })
  listTickets(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('orgId') orgId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('category') category?: string,
  ) {
    return this.ticketsService.listTickets({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
      priority,
      orgId,
      assigneeId,
      category,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket detail with notes and escalations' })
  getTicket(@Param('id') id: string) {
    return this.ticketsService.getTicket(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update ticket status, priority, or assignee' })
  updateTicket(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketsService.updateTicket(id, dto);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add a note to a ticket' })
  addNote(@Param('id') id: string, @Body() dto: CreateNoteDto, @Req() req: any) {
    return this.ticketsService.addNote(id, dto, req.user.id);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign or reassign a ticket' })
  assignTicket(@Param('id') id: string, @Body('assigneeId') assigneeId: string) {
    return this.ticketsService.assignTicket(id, assigneeId);
  }

  @Post(':id/escalate')
  @ApiOperation({ summary: 'Escalate a ticket' })
  escalateTicket(@Param('id') id: string, @Body() dto: EscalateTicketDto, @Req() req: any) {
    return this.ticketsService.escalateTicket(id, dto, req.user.id);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve a ticket' })
  resolveTicket(@Param('id') id: string) {
    return this.ticketsService.resolveTicket(id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close a ticket' })
  closeTicket(@Param('id') id: string) {
    return this.ticketsService.closeTicket(id);
  }
}
