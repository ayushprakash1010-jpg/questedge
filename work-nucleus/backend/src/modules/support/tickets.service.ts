import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketPriority, TicketStatus } from '@prisma/client';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { EscalateTicketDto } from './dto/escalate-ticket.dto';

const SLA_HOURS: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 72,
};

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(dto: CreateTicketDto, creatorId: string) {
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + (SLA_HOURS[dto.priority || 'MEDIUM'] || 24));

    return this.prisma.supportTicket.create({
      data: {
        orgId: dto.orgId,
        title: dto.title,
        description: dto.description,
        priority: (dto.priority as TicketPriority) || 'MEDIUM',
        category: dto.category as any || 'GENERAL',
        reportedBy: dto.reportedBy,
        assigneeId: dto.assigneeId,
        tags: dto.tags || [],
        slaDeadline,
      },
      include: {
        organization: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async listTickets(query: {
    page: number;
    limit: number;
    status?: string;
    priority?: string;
    orgId?: string;
    assigneeId?: string;
    category?: string;
    reportedBy?: string;
  }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.orgId) where.orgId = query.orgId;
    if (query.assigneeId) where.assigneeId = query.assigneeId;
    if (query.category) where.category = query.category;
    if (query.reportedBy) where.reportedBy = query.reportedBy;

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        include: {
          organization: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
          _count: { select: { notes: true, escalations: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      data: tickets,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getTicket(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true, industry: true } },
        assignee: { select: { id: true, name: true, email: true } },
        notes: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, name: true } } },
        },
        escalations: {
          orderBy: { createdAt: 'desc' },
          include: { escalatedBy: { select: { id: true, name: true } } },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async updateTicket(id: string, dto: UpdateTicketDto) {
    const data: any = {};
    if (dto.status) data.status = dto.status;
    if (dto.priority) {
      data.priority = dto.priority;
      // Recalculate SLA if priority changed
      const slaDeadline = new Date();
      slaDeadline.setHours(slaDeadline.getHours() + (SLA_HOURS[dto.priority] || 24));
      data.slaDeadline = slaDeadline;
    }
    if (dto.assigneeId) data.assigneeId = dto.assigneeId;
    if (dto.category) data.category = dto.category;

    return this.prisma.supportTicket.update({
      where: { id },
      data,
      include: {
        organization: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });
  }

  async addNote(ticketId: string, dto: CreateNoteDto, authorId: string) {
    // Check if this is the first response
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { firstResponseAt: true, status: true },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    const note = await this.prisma.supportNote.create({
      data: {
        ticketId,
        authorId,
        content: dto.content,
        isInternal: dto.isInternal ?? true,
      },
      include: { author: { select: { id: true, name: true } } },
    });

    // Set first response time if not yet set and note is client-visible
    if (!ticket.firstResponseAt && !dto.isInternal) {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          firstResponseAt: new Date(),
          status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : undefined,
        },
      });
    }

    return note;
  }

  async assignTicket(id: string, assigneeId: string) {
    return this.prisma.supportTicket.update({
      where: { id },
      data: { assigneeId, status: 'IN_PROGRESS' },
      include: {
        organization: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });
  }

  async escalateTicket(id: string, dto: EscalateTicketDto, escalatedById: string) {
    const [ticket, escalation] = await Promise.all([
      this.prisma.supportTicket.update({
        where: { id },
        data: { status: 'ESCALATED' },
      }),
      this.prisma.supportEscalation.create({
        data: {
          ticketId: id,
          level: dto.level as any,
          reason: dto.reason,
          escalatedById,
        },
        include: { escalatedBy: { select: { id: true, name: true } } },
      }),
    ]);

    return { ticket, escalation };
  }

  async resolveTicket(id: string) {
    return this.prisma.supportTicket.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
  }

  async closeTicket(id: string) {
    return this.prisma.supportTicket.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }
}
