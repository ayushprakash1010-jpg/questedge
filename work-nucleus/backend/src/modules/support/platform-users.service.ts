import { Injectable, NotFoundException } from '@nestjs/common';
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

  private async getValidOrgId(actorId: string): Promise<string> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { orgId: true },
    });
    if (actor?.orgId) return actor.orgId;
    const fallbackOrg = await this.prisma.organization.findFirst({
      select: { id: true },
    });
    if (!fallbackOrg) throw new Error('No valid organization found for audit trail');
    return fallbackOrg.id;
  }

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

    // 1. Recruiter profile filter
    if (userType === UserType.RECRUITER) {
      const recWhere: any = {};
      if (search) {
        recWhere.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (isActive !== undefined) recWhere.isActive = isActive;

      const [recruiters, total] = await this.prisma.$transaction([
        this.prisma.recruiterProfile.findMany({
          where: recWhere,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.recruiterProfile.count({ where: recWhere }),
      ]);

      return {
        data: recruiters.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          role: r.isVerified ? 'VERIFIED_RECRUITER' : 'RECRUITER',
          userType: 'RECRUITER',
          isActive: r.isActive,
          orgId: null,
          orgName: 'Marketplace Recruiter',
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    // 2. Candidate profile filter
    if (userType === UserType.CANDIDATE) {
      const candWhere: any = {};
      if (search) {
        candWhere.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (isActive !== undefined) candWhere.isActive = isActive;

      const [candidates, total] = await this.prisma.$transaction([
        this.prisma.candidateProfile.findMany({
          where: candWhere,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.candidateProfile.count({ where: candWhere }),
      ]);

      return {
        data: candidates.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          role: 'CANDIDATE',
          userType: 'CANDIDATE',
          isActive: c.isActive,
          orgId: null,
          orgName: 'Candidate Portal',
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    // 3. Specific Company role or org filter
    const userWhere: any = {};
    if (search) {
      userWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) userWhere.role = role;
    if (userType) userWhere.userType = userType;
    if (isActive !== undefined) userWhere.isActive = isActive;
    if (orgId) userWhere.orgId = orgId;

    if (role || orgId || userType) {
      const [users, total] = await this.prisma.$transaction([
        this.prisma.user.findMany({
          where: userWhere,
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
        this.prisma.user.count({ where: userWhere }),
      ]);

      return {
        data: users.map((u) => ({
          ...u,
          orgName: u.organization?.name ?? null,
          organization: undefined,
        })),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    // 4. Default: Cross-platform directory (Users + Recruiters + Candidates)
    const recWhere: any = {};
    const candWhere: any = {};
    if (search) {
      recWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
      candWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      recWhere.isActive = isActive;
      candWhere.isActive = isActive;
    }

    const [users, recruiters, candidates, totalUsers, totalRecruiters, totalCandidates] =
      await Promise.all([
        this.prisma.user.findMany({
          where: userWhere,
          orderBy: { createdAt: 'desc' },
          take: limit + skip,
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
        this.prisma.recruiterProfile.findMany({
          where: recWhere,
          orderBy: { createdAt: 'desc' },
          take: limit + skip,
        }),
        this.prisma.candidateProfile.findMany({
          where: candWhere,
          orderBy: { createdAt: 'desc' },
          take: limit + skip,
        }),
        this.prisma.user.count({ where: userWhere }),
        this.prisma.recruiterProfile.count({ where: recWhere }),
        this.prisma.candidateProfile.count({ where: candWhere }),
      ]);

    const combined = [
      ...users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        userType: u.userType || 'COMPANY_USER',
        isActive: u.isActive,
        orgId: u.orgId,
        orgName: u.organization?.name ?? null,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      ...recruiters.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.isVerified ? 'VERIFIED_RECRUITER' : 'RECRUITER',
        userType: 'RECRUITER',
        isActive: r.isActive,
        orgId: null,
        orgName: 'Recruiter Marketplace',
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      ...candidates.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        role: 'CANDIDATE',
        userType: 'CANDIDATE',
        isActive: c.isActive,
        orgId: null,
        orgName: 'Candidate Portal',
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    ];

    combined.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const pagedData = combined.slice(skip, skip + limit);
    const total = totalUsers + totalRecruiters + totalCandidates;

    return {
      data: pagedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
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

    if (user) {
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

    const recruiter = await this.prisma.recruiterProfile.findUnique({
      where: { id: userId },
    });
    if (recruiter) {
      return {
        id: recruiter.id,
        name: recruiter.name,
        email: recruiter.email,
        role: recruiter.isVerified ? 'VERIFIED_RECRUITER' : 'RECRUITER',
        userType: 'RECRUITER',
        isActive: recruiter.isActive,
        orgId: null,
        createdAt: recruiter.createdAt,
        updatedAt: recruiter.updatedAt,
        organization: { id: '', name: 'Recruiter Marketplace', industry: 'Staffing & Recruiting' },
        recentActivity: [],
      };
    }

    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { id: userId },
    });
    if (candidate) {
      return {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        role: 'CANDIDATE',
        userType: 'CANDIDATE',
        isActive: candidate.isActive,
        orgId: null,
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt,
        organization: { id: '', name: 'Candidate Portal', industry: 'Job Seeker' },
        recentActivity: [],
      };
    }

    throw new NotFoundException(`User with ID ${userId} not found`);
  }

  async deactivateUser(userId: string, actorId: string, reason: string) {
    const user = await this.prisma.user.findUnique({
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

    if (user) {
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

    const recruiter = await this.prisma.recruiterProfile.findUnique({
      where: { id: userId },
    });
    if (recruiter) {
      await this.prisma.recruiterProfile.update({
        where: { id: userId },
        data: { isActive: false },
      });
      const orgId = await this.getValidOrgId(actorId);
      await this.auditService.log({
        orgId,
        userId: actorId,
        action: 'ADMIN_USER_DEACTIVATED',
        entityType: 'RECRUITER_PROFILE',
        entityId: userId,
        changes: {
          before: { isActive: true },
          after: { isActive: false },
          reason,
          targetEmail: recruiter.email,
          targetName: recruiter.name,
        },
      });
      return { success: true, message: `Recruiter ${recruiter.email} deactivated` };
    }

    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { id: userId },
    });
    if (candidate) {
      await this.prisma.candidateProfile.update({
        where: { id: userId },
        data: { isActive: false },
      });
      const orgId = await this.getValidOrgId(actorId);
      await this.auditService.log({
        orgId,
        userId: actorId,
        action: 'ADMIN_USER_DEACTIVATED',
        entityType: 'CANDIDATE_PROFILE',
        entityId: userId,
        changes: {
          before: { isActive: true },
          after: { isActive: false },
          reason,
          targetEmail: candidate.email,
          targetName: candidate.name,
        },
      });
      return { success: true, message: `Candidate ${candidate.email} deactivated` };
    }

    throw new NotFoundException(`User with ID ${userId} not found`);
  }

  async activateUser(userId: string, actorId: string, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        orgId: true,
      },
    });

    if (user) {
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

    const recruiter = await this.prisma.recruiterProfile.findUnique({
      where: { id: userId },
    });
    if (recruiter) {
      await this.prisma.recruiterProfile.update({
        where: { id: userId },
        data: { isActive: true },
      });
      const orgId = await this.getValidOrgId(actorId);
      await this.auditService.log({
        orgId,
        userId: actorId,
        action: 'ADMIN_USER_ACTIVATED',
        entityType: 'RECRUITER_PROFILE',
        entityId: userId,
        changes: {
          before: { isActive: false },
          after: { isActive: true },
          reason,
          targetEmail: recruiter.email,
          targetName: recruiter.name,
        },
      });
      return { success: true, message: `Recruiter ${recruiter.email} activated` };
    }

    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { id: userId },
    });
    if (candidate) {
      await this.prisma.candidateProfile.update({
        where: { id: userId },
        data: { isActive: true },
      });
      const orgId = await this.getValidOrgId(actorId);
      await this.auditService.log({
        orgId,
        userId: actorId,
        action: 'ADMIN_USER_ACTIVATED',
        entityType: 'CANDIDATE_PROFILE',
        entityId: userId,
        changes: {
          before: { isActive: false },
          after: { isActive: true },
          reason,
          targetEmail: candidate.email,
          targetName: candidate.name,
        },
      });
      return { success: true, message: `Candidate ${candidate.email} activated` };
    }

    throw new NotFoundException(`User with ID ${userId} not found`);
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
    const { search, role, userType, isActive, orgId } = query;

    if (userType === UserType.RECRUITER) {
      const recWhere: any = {};
      if (search) {
        recWhere.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (isActive !== undefined) recWhere.isActive = isActive;
      const recruiters = await this.prisma.recruiterProfile.findMany({
        where: recWhere,
        take: 5000,
        orderBy: { createdAt: 'desc' },
      });
      return recruiters.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.isVerified ? 'VERIFIED_RECRUITER' : 'RECRUITER',
        userType: 'RECRUITER',
        isActive: r.isActive,
        createdAt: r.createdAt,
        organization: { name: 'Recruiter Marketplace' },
      }));
    }

    if (userType === UserType.CANDIDATE) {
      const candWhere: any = {};
      if (search) {
        candWhere.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (isActive !== undefined) candWhere.isActive = isActive;
      const candidates = await this.prisma.candidateProfile.findMany({
        where: candWhere,
        take: 5000,
        orderBy: { createdAt: 'desc' },
      });
      return candidates.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        role: 'CANDIDATE',
        userType: 'CANDIDATE',
        isActive: c.isActive,
        createdAt: c.createdAt,
        organization: { name: 'Candidate Portal' },
      }));
    }

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
