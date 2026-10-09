import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ProvisionDto } from './dto/provision.dto';
import { SyncDto } from './dto/sync.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly syncSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.syncSecret =
      this.configService.get<string>('AUTH0_SYNC_SECRET') || '';
  }

  async provision(
    auth0Sub: string,
    email: string,
    dto: ProvisionDto,
  ) {
    // Check if user is already provisioned
    const existing = await this.prisma.user.findUnique({
      where: { auth0Sub },
    });

    if (existing) {
      throw new ConflictException('User is already provisioned');
    }

    // Create org + admin user in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.orgName,
          industry: dto.industry,
        },
      });

      const user = await tx.user.create({
        data: {
          orgId: organization.id,
          email,
          auth0Sub,
          name: dto.name,
          role: Role.ADMIN,
        },
      });

      return { user, organization };
    });

    this.logger.log(
      `Provisioned org "${result.organization.name}" with admin user "${result.user.email}"`,
    );

    return result;
  }

  async resetRole(auth0Sub: string) {
    try {
      // Attempt to delete Company user
      const user = await this.prisma.user.findUnique({ where: { auth0Sub } });
      if (user) {
        await this.prisma.user.delete({ where: { auth0Sub } });
        const orgUsers = await this.prisma.user.count({ where: { orgId: user.orgId } });
        if (orgUsers === 0) {
          await this.prisma.organization.delete({ where: { id: user.orgId } }).catch(() => null);
        }
      }

      // Attempt to delete Recruiter
      const recruiter = await this.prisma.recruiterProfile.findUnique({ where: { auth0Sub } });
      if (recruiter) {
        await this.prisma.recruiterProfile.delete({ where: { auth0Sub } });
      }

      // Attempt to delete Candidate
      const candidate = await this.prisma.candidateProfile.findUnique({ where: { auth0Sub } });
      if (candidate) {
        await this.prisma.candidateProfile.delete({ where: { auth0Sub } });
      }

      this.logger.log(`Reset role for auth0Sub: ${auth0Sub}`);
      return { success: true };
    } catch (err: any) {
      this.logger.error(`Failed to reset role for ${auth0Sub}: ${err.message}`);
      throw new ConflictException('Cannot reset role. You have active associations (e.g. referrals or mandates).');
    }
  }

  async getMe(auth0Sub: string) {
    const user = await this.prisma.user.findUnique({
      where: { auth0Sub },
      include: { organization: true },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        industry: user.organization.industry,
      },
    };
  }

  async getRecruiterMe(auth0Sub: string) {
    const recruiter = await this.prisma.recruiterProfile.findUnique({
      where: { auth0Sub },
    });

    if (!recruiter) {
      return null;
    }

    return {
      id: recruiter.id,
      email: recruiter.email,
      name: recruiter.name,
      phone: recruiter.phone,
      headline: recruiter.headline,
      specializations: recruiter.specializations,
      experienceYears: recruiter.experienceYears,
      linkedinUrl: recruiter.linkedinUrl,
      isVerified: recruiter.isVerified,
      isActive: recruiter.isActive,
    };
  }

  async getCandidateMe(auth0Sub: string) {
    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { auth0Sub },
    });

    if (!candidate) {
      return null;
    }

    return {
      id: candidate.id,
      email: candidate.email,
      name: candidate.name,
      isActive: candidate.isActive,
    };
  }

  async syncFromAuth0(dto: SyncDto, webhookSecret: string) {
    if (!this.syncSecret || webhookSecret !== this.syncSecret) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    const updateData: Record<string, string> = {};
    if (dto.email) updateData.email = dto.email;
    if (dto.name) updateData.name = dto.name;
    if (dto.avatarUrl) updateData.avatarUrl = dto.avatarUrl;

    if (Object.keys(updateData).length === 0) {
      return { updated: false };
    }

    const user = await this.prisma.user.update({
      where: { auth0Sub: dto.auth0Sub },
      data: updateData,
    });

    this.logger.log(`Synced Auth0 profile for user "${user.email}"`);

    return { updated: true, userId: user.id };
  }
}
