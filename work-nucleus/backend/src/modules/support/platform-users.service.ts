import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role, UserType } from '@prisma/client';

export interface ListUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: Role;
  userType?: UserType;
  isActive?: boolean;
  orgId?: string;
}

@Injectable()
export class PlatformUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listUsers(query: ListUsersQuery) {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      userType,
      isActive,
      orgId,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (userType) where.userType = userType;
    if (isActive !== undefined) where.isActive = isActive;
    if (orgId) where.orgId = orgId;

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          userType: true,
          isActive: true,
          orgId: true,
          createdAt: true,
          updatedAt: true,
          organization: { select: { id: true, name: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => ({
        ...u,
        orgName: u.organization?.name ?? null,
        organization: undefined,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        userType: true,
        isActive: true,
        orgId: true,
        createdAt: true,
        updatedAt: true,
        organization: { select: { id: true, name: true, industry: true } },
      },
    });

    // Last 20 audit log entries for this user
    const recentActivity = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        ipAddress: true,
        createdAt: true,
      },
    });

    return { ...user, recentActivity };
  }

  async deactivateUser(userId: string, actorId: string, reason: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        orgId: true,
        role: true,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    await this.auditService.log({
      orgId: user.orgId,
      userId: actorId,
      action: 'ADMIN_USER_DEACTIVATED',
      entityType: 'USER',
      entityId: userId,
      changes: {
        before: { isActive: true },
        after: { isActive: false },
        reason,
        targetEmail: user.email,
        targetName: user.name,
      },
    });

    return { success: true, message: `User ${user.email} deactivated` };
  }

  async activateUser(userId: string, actorId: string, reason: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        orgId: true,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    await this.auditService.log({
      orgId: user.orgId,
      userId: actorId,
      action: 'ADMIN_USER_ACTIVATED',
      entityType: 'USER',
      entityId: userId,
      changes: {
        before: { isActive: false },
        after: { isActive: true },
        reason,
        targetEmail: user.email,
        targetName: user.name,
      },
    });

    return { success: true, message: `User ${user.email} activated` };
  }

  async bulkUpdateUsers(
    userIds: string[],
    action: 'activate' | 'deactivate',
    actorId: string,
    reason: string,
  ) {
    const isActive = action === 'activate';

    // Fetch all target users
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true, orgId: true, isActive: true },
    });

    // Only update users that need a change
    const toUpdate = users.filter((u) => u.isActive !== isActive);
    if (toUpdate.length === 0) return { updated: 0, skipped: users.length };

    await this.prisma.user.updateMany({
      where: { id: { in: toUpdate.map((u) => u.id) } },
      data: { isActive },
    });

    // Audit each update
    await Promise.all(
      toUpdate.map((user) =>
        this.auditService.log({
          orgId: user.orgId,
          userId: actorId,
          action: isActive ? 'ADMIN_USER_BULK_ACTIVATED' : 'ADMIN_USER_BULK_DEACTIVATED',
          entityType: 'USER',
          entityId: user.id,
          changes: {
            before: { isActive: !isActive },
            after: { isActive },
            reason,
            targetEmail: user.email,
            bulkOperation: true,
          },
        }),
      ),
    );

    return {
      updated: toUpdate.length,
      skipped: users.length - toUpdate.length,
      message: `${toUpdate.length} user(s) ${action}d successfully`,
    };
  }

  async exportUsers(query: ListUsersQuery) {
    const where: any = {};
    const { search, role, userType, isActive, orgId } = query;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (userType) where.userType = userType;
    if (isActive !== undefined) where.isActive = isActive;
    if (orgId) where.orgId = orgId;

    return this.prisma.user.findMany({
      where,
      take: 5000,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        userType: true,
        isActive: true,
        createdAt: true,
        organization: { select: { name: true } },
      },
    });
  }
}
