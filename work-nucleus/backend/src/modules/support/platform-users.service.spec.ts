import { Test, TestingModule } from '@nestjs/testing';
import { PlatformUsersService } from './platform-users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('PlatformUsersService - Admin Role Management', () => {
  let service: PlatformUsersService;
  let prismaMock: any;
  let auditMock: any;

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      organization: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    auditMock = {
      log: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformUsersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();

    service = module.get<PlatformUsersService>(PlatformUsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addSupportAdmin', () => {
    it('creates and pre-provisions a new support admin when user does not exist', async () => {
      prismaMock.organization.findFirst.mockResolvedValueOnce({
        id: 'platform-org-id',
        name: 'QuestEdge Platform',
      });
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null) // target user does not exist
        .mockResolvedValueOnce({ orgId: 'actor-org-id' }); // getValidOrgId for actor

      prismaMock.user.create.mockResolvedValueOnce({
        id: 'new-user-id',
        email: 'ops@questedge.in',
        name: 'Ops Lead',
        role: Role.SUPPORT_ADMIN,
        orgId: 'platform-org-id',
        isActive: true,
      });

      const result = await service.addSupportAdmin(
        {
          email: 'ops@questedge.in',
          name: 'Ops Lead',
          role: Role.SUPPORT_ADMIN,
          reason: 'Onboarding platform lead',
        },
        'actor-admin-id',
      );

      expect(result.success).toBe(true);
      expect(result.user.role).toBe(Role.SUPPORT_ADMIN);
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'ops@questedge.in',
            role: Role.SUPPORT_ADMIN,
            orgId: 'platform-org-id',
            isActive: true,
          }),
        }),
      );
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'GRANT_SUPPORT_ROLE',
          userId: 'actor-admin-id',
          changes: expect.objectContaining({
            after: { role: Role.SUPPORT_ADMIN },
            reason: 'Onboarding platform lead',
          }),
        }),
      );
    });

    it('rejects adding an invalid role', async () => {
      await expect(
        service.addSupportAdmin(
          {
            email: 'test@example.com',
            role: Role.VIEWER,
            reason: 'Test reason',
          },
          'actor-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects granting admin access to a deactivated account', async () => {
      prismaMock.organization.findFirst.mockResolvedValueOnce({ id: 'org-id' });
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'deactivated-user-id',
        email: 'deactivated@example.com',
        isActive: false,
      });

      await expect(
        service.addSupportAdmin(
          {
            email: 'deactivated@example.com',
            role: Role.SUPPORT_ADMIN,
            reason: 'Promote deactivated user',
          },
          'actor-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateUserRole', () => {
    it('updates role and creates audit log', async () => {
      const existingUser = {
        id: 'target-user-id',
        email: 'sarah@example.com',
        name: 'Sarah',
        role: Role.HR,
      };

      prismaMock.user.findUnique
        .mockResolvedValueOnce(existingUser) // target user
        .mockResolvedValueOnce({ orgId: 'actor-org-id' }); // getValidOrgId

      prismaMock.user.update.mockResolvedValueOnce({
        ...existingUser,
        role: Role.SUPPORT_ADMIN,
      });

      const result = await service.updateUserRole(
        'target-user-id',
        Role.SUPPORT_ADMIN,
        'actor-admin-id',
        'Promoted to platform support lead',
      );

      expect(result.success).toBe(true);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'target-user-id' },
        data: { role: Role.SUPPORT_ADMIN },
      });
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CHANGE_USER_ROLE',
          userId: 'actor-admin-id',
          changes: expect.objectContaining({
            before: { role: Role.HR },
            after: { role: Role.SUPPORT_ADMIN },
            reason: 'Promoted to platform support lead',
          }),
        }),
      );
    });

    it('protects root owner from being demoted', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'root-owner-id',
        email: 'ayushprakash1110@gmail.com',
        role: Role.SUPPORT_ADMIN,
      });

      await expect(
        service.updateUserRole(
          'root-owner-id',
          Role.VIEWER,
          'other-admin-id',
          'Attempting demotion',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('protects admin from removing their own admin access', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'my-admin-id',
        email: 'admin@example.com',
        role: Role.SUPPORT_ADMIN,
      });

      await expect(
        service.updateUserRole(
          'my-admin-id',
          Role.VIEWER,
          'my-admin-id', // self
          'Demoting myself',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
