import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Auth0ManagementService } from '../auth/auth0-management.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { Prisma } from '@prisma/client';

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
    // Check if email already exists in this org
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    // Create user in Auth0 (sends password reset email)
    const auth0Sub = await this.auth0Management.createUser(
      dto.email,
      dto.name,
    );

    // Create local user record
    const user = await this.prisma.user.create({
      data: {
        orgId,
        email: dto.email,
        name: dto.name,
        role: dto.role,
        auth0Sub,
      },
    });

    this.logger.log(`Invited user ${dto.email} with role ${dto.role}`);

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

  async update(orgId: string, userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, orgId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });

    this.logger.log(`Updated user ${updated.email}: ${JSON.stringify(dto)}`);

    return updated;
  }

  async remove(orgId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, orgId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete: deactivate locally
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    // Block in Auth0
    await this.auth0Management.blockUser(user.auth0Sub);

    this.logger.log(`Deactivated user ${user.email}`);

    return { message: 'User deactivated' };
  }
}
