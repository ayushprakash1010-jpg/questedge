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
import { Role, UserType } from '@prisma/client';
import { DemoProvisionDto } from './dto/demo-provision.dto';
import { DemoRoleTarget } from './dto/demo-switch-role.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly syncSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.syncSecret = this.configService.get<string>('AUTH0_SYNC_SECRET') || '';
  }

  async provision(auth0Sub: string, email: string, dto: ProvisionDto) {
    // Check if user is already provisioned
    const existing = await this.prisma.user.findUnique({
      where: { auth0Sub },
    });

    if (existing) {
      throw new ConflictException('User is already provisioned');
    }

    const existingRecruiter = await this.prisma.recruiterProfile.findUnique({
      where: { auth0Sub },
    });
    if (existingRecruiter) {
      throw new ConflictException('User is already registered as a recruiter');
    }

    const existingCandidate = await this.prisma.candidateProfile.findUnique({
      where: { auth0Sub },
    });
    if (existingCandidate) {
      throw new ConflictException('User is already registered as a candidate');
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
        const orgUsers = await this.prisma.user.count({
          where: { orgId: user.orgId },
        });
        if (orgUsers === 0) {
          await this.prisma.organization
            .delete({ where: { id: user.orgId } })
            .catch(() => null);
        }
      }

      // Attempt to delete Recruiter
      const recruiter = await this.prisma.recruiterProfile.findUnique({
        where: { auth0Sub },
      });
      if (recruiter) {
        await this.prisma.recruiterProfile.delete({ where: { auth0Sub } });
      }

      // Attempt to delete Candidate
      const candidate = await this.prisma.candidateProfile.findUnique({
        where: { auth0Sub },
      });
      if (candidate) {
        await this.prisma.candidateProfile.delete({ where: { auth0Sub } });
      }

      this.logger.log(`Reset role for auth0Sub: ${auth0Sub}`);
      return { success: true };
    } catch (err: any) {
      this.logger.error(`Failed to reset role for ${auth0Sub}: ${err.message}`);
      throw new ConflictException(
        'Cannot reset role. You have active associations (e.g. referrals or mandates).',
      );
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

  // -------------------------------------------------------------------------
  // DEMO ACCOUNT — provision all 3 profiles for a single Auth0 sub
  // -------------------------------------------------------------------------

  async provisionDemo(auth0Sub: string, email: string, dto: DemoProvisionDto) {
    const [existingUser, existingRecruiter, existingCandidate] =
      await Promise.all([
        this.prisma.user.findUnique({ where: { auth0Sub } }),
        this.prisma.recruiterProfile.findUnique({ where: { auth0Sub } }),
        this.prisma.candidateProfile.findUnique({ where: { auth0Sub } }),
      ]);

    const hasNonDemo =
      (existingUser && !existingUser.isDemoAccount) ||
      (existingRecruiter && !existingRecruiter.isDemoAccount) ||
      (existingCandidate && !existingCandidate.isDemoAccount);

    if (hasNonDemo) {
      throw new ConflictException(
        'This Auth0 account already has a real (non-demo) profile. Cannot provision demo on a real account.',
      );
    }

    if (
      existingUser?.isDemoAccount &&
      existingRecruiter?.isDemoAccount &&
      existingCandidate?.isDemoAccount
    ) {
      throw new ConflictException('Demo account is already fully provisioned.');
    }

    const domain = email.split('@')[1] ?? 'demo.questedge.com';
    const localPart = email.split('@')[0];
    const recruiterEmail = `${localPart}+recruiter@${domain}`;
    const candidateEmail = `${localPart}+candidate@${domain}`;

    const result = await this.prisma.$transaction(async (tx) => {
      let companyUser = existingUser;
      let organization: any = null;

      if (!companyUser) {
        organization = await tx.organization.create({
          data: { name: dto.orgName, industry: dto.industry ?? 'Technology' },
        });
        companyUser = await tx.user.create({
          data: {
            orgId: organization.id,
            email,
            auth0Sub,
            name: dto.name,
            role: Role.ADMIN,
            userType: UserType.COMPANY_ADMIN,
            isDemoAccount: true,
          },
        });
      } else {
        organization = await tx.organization.findUnique({
          where: { id: companyUser.orgId },
        });
      }

      let recruiterProfile = existingRecruiter;
      if (!recruiterProfile) {
        recruiterProfile = await tx.recruiterProfile.create({
          data: {
            auth0Sub,
            email: recruiterEmail,
            name: `${dto.name} (Recruiter)`,
            headline: 'Demo Recruiter — Technical Talent Acquisition',
            experienceYears: 5,
            isVerified: true,
            verifiedAt: new Date(),
            isDemoAccount: true,
          },
        });
      }

      let candidateProfile = existingCandidate;
      if (!candidateProfile) {
        const emailHash = Buffer.from(candidateEmail).toString('base64');
        candidateProfile = await tx.candidateProfile.create({
          data: {
            auth0Sub,
            email: candidateEmail,
            emailHash,
            name: `${dto.name} (Candidate)`,
            headline: 'Demo Candidate — Full-Stack Engineer',
            experienceYears: 4,
            currentCompany: 'Previous Corp',
            currentDesignation: 'Software Engineer',
            skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
            isProfileComplete: true,
            isDemoAccount: true,
          },
        });
      }

      return { companyUser, organization, recruiterProfile, candidateProfile };
    });

    this.logger.log(
      `Demo account provisioned for auth0Sub: ${auth0Sub} | email: ${email}`,
    );

    return {
      message: 'Demo account fully provisioned with all 3 role profiles.',
      companyUser: {
        id: result.companyUser.id,
        email: result.companyUser.email,
        role: result.companyUser.role,
        userType: result.companyUser.userType,
        isDemoAccount: true,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
      },
      recruiterProfile: {
        id: result.recruiterProfile.id,
        email: result.recruiterProfile.email,
        isDemoAccount: true,
      },
      candidateProfile: {
        id: result.candidateProfile.id,
        email: result.candidateProfile.email,
        isDemoAccount: true,
      },
    };
  }

  async getDemoRoleProfile(auth0Sub: string, targetRole: DemoRoleTarget) {
    switch (targetRole) {
      case DemoRoleTarget.COMPANY: {
        const user = await this.prisma.user.findUnique({
          where: { auth0Sub },
          include: { organization: true },
        });
        if (!user?.isDemoAccount) return null;
        return {
          userType: 'COMPANY_USER',
          activeRole: 'COMPANY',
          isProvisioned: true,
          profile: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatarUrl: user.avatarUrl,
            isActive: user.isActive,
            isDemoAccount: true,
            organization: {
              id: user.organization.id,
              name: user.organization.name,
              industry: user.organization.industry,
            },
          },
        };
      }
      case DemoRoleTarget.RECRUITER: {
        const recruiter = await this.prisma.recruiterProfile.findUnique({
          where: { auth0Sub },
        });
        if (!recruiter?.isDemoAccount) return null;
        return {
          userType: 'RECRUITER',
          activeRole: 'RECRUITER',
          isProvisioned: true,
          profile: {
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
            isDemoAccount: true,
          },
        };
      }
      case DemoRoleTarget.CANDIDATE: {
        const candidate = await this.prisma.candidateProfile.findUnique({
          where: { auth0Sub },
        });
        if (!candidate?.isDemoAccount) return null;
        return {
          userType: 'CANDIDATE',
          activeRole: 'CANDIDATE',
          isProvisioned: true,
          profile: {
            id: candidate.id,
            email: candidate.email,
            name: candidate.name,
            headline: candidate.headline,
            isActive: candidate.isActive,
            isDemoAccount: true,
          },
        };
      }
    }
  }
}