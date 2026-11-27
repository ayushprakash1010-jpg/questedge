import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Auth0ManagementService } from '../auth/auth0-management.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { Prisma, Role } from '@prisma/client';
import { Auth0JwtStrategy } from '../auth/strategies/auth0-jwt.strategy';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth0Management: Auth0ManagementService,
  ) {}

  async list(orgId: string, query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { role } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = { orgId };
    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(orgId: string, dto: CreateUserDto) {
    const cleanEmail = dto.email.trim().toLowerCase();
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    // Create user in Auth0 (sends password reset email)
    const auth0Sub = await this.auth0Management.createUser(cleanEmail, dto.name);

    // Create local user record (clean up Auth0 user if DB insert fails)
    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          orgId,
          email: cleanEmail,
          name: dto.name,
          role: dto.role,
          auth0Sub,
        },
      });
    } catch (err) {
      await this.auth0Management.blockUser(auth0Sub).catch(() => null);
      throw err;
    }

    this.logger.log(`Invited user ${cleanEmail} with role ${dto.role}`);

    return user;
  }

  async findOne(orgId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, orgId },
      include: { organization: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(
    orgId: string,
    userId: string,
    dto: UpdateUserDto,
    callerId: string,
  ) {
    // ── P0-02: Block self-role-edit ─────────────────────────────
    if (dto.role && userId === callerId) {
      throw new ForbiddenException('You cannot change your own role.');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, orgId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // ── P0-02: Prevent removal of the last ADMIN ───────────────
    if (
      dto.role &&
      dto.role !== Role.ADMIN &&
      user.role === Role.ADMIN
    ) {
      const adminCount = await this.prisma.user.count({
        where: { orgId, role: Role.ADMIN, isActive: true },
      });
      if (adminCount <= 1) {
        throw new ForbiddenException(
          'Cannot change the role of the last active admin. Promote another user to ADMIN first.',
        );
      }
    }

    // ── P0-02: Prevent deactivation of the last ADMIN ──────────
    if (
      dto.isActive === false &&
      user.role === Role.ADMIN &&
      user.isActive
    ) {
      const adminCount = await this.prisma.user.count({
        where: { orgId, role: Role.ADMIN, isActive: true },
      });
      if (adminCount <= 1) {
        throw new ForbiddenException(
          'Cannot deactivate the last active admin.',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });

    Auth0JwtStrategy.invalidateCache(updated.auth0Sub);
    if (dto.isActive === false) {
      await this.auth0Management.blockUser?.(updated.auth0Sub)?.catch?.(() => null);
    }

    this.logger.log(`Updated user ${updated.email}: ${JSON.stringify(dto)}`);

    return updated;
  }

  async remove(orgId: string, userId: string, callerId?: string) {
    if (callerId && userId === callerId) {
      throw new ForbiddenException('You cannot deactivate your own account.');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, orgId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === Role.ADMIN && user.isActive) {
      const activeAdmins = await this.prisma.user.count({
        where: { orgId, role: Role.ADMIN, isActive: true },
      });
      if (activeAdmins <= 1) {
        throw new ForbiddenException(
          'Cannot deactivate the last active admin.',
        );
      }
    }

    // Soft delete: deactivate locally
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    Auth0JwtStrategy.invalidateCache(user.auth0Sub);

    // Block in Auth0
    await this.auth0Management.blockUser(user.auth0Sub);

    this.logger.log(`Deactivated user ${user.email}`);

    return { message: 'User deactivated' };
  }
}
