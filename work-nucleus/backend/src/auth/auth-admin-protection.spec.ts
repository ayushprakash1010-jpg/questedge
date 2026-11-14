import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('AuthService - Admin Protection and Identity Verification', () => {
  let authService: AuthService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      organization: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: string) => {
              if (key === 'AUTH0_SYNC_SECRET') return 'test-secret';
              return defaultVal;
            }),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.SUPPORT_ADMIN_EMAILS;
    delete process.env.SUPPORT_ADMIN_SUBS;
  });

  it('rejects auto-linking designated admin if email is not verified', async () => {
    process.env.SUPPORT_ADMIN_EMAILS = 'admin@questedge.in';

    // No user currently mapped to caller sub
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.findFirst.mockResolvedValueOnce(null); // No unlinked placeholder

    const result = await authService.getMe(
      'auth0|unverified-attacker',
      'admin@questedge.in',
      false, // NOT verified!
    );

    // Must return null, NOT link the account or grant SUPPORT_ADMIN
    expect(result).toBeNull();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('allows auto-linking designated admin if email is verified', async () => {
    process.env.SUPPORT_ADMIN_EMAILS = 'admin@questedge.in';

    const existingAdminRecord = {
      id: 'admin-user-uuid',
      auth0Sub: 'auth0|old-sub',
      email: 'admin@questedge.in',
      name: 'Admin User',
      role: Role.ADMIN,
      isActive: true,
      orgId: 'org-uuid',
      organization: { id: 'org-uuid', name: 'QuestEdge Platform' },
    };

    // First lookup by sub returns null
    prismaMock.user.findUnique
      .mockResolvedValueOnce(null) // by sub
      .mockResolvedValueOnce(existingAdminRecord); // by email during step 4

    prismaMock.user.findFirst.mockResolvedValueOnce(null); // step 1 unlinked

    prismaMock.user.update.mockResolvedValueOnce({
      ...existingAdminRecord,
      auth0Sub: 'auth0|verified-admin',
      role: Role.SUPPORT_ADMIN,
    });

    const result = await authService.getMe(
      'auth0|verified-admin',
      'admin@questedge.in',
      true, // VERIFIED!
    );

    expect(result).toBeDefined();
    expect(result?.role).toBe(Role.SUPPORT_ADMIN);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'admin-user-uuid' },
      data: {
        auth0Sub: 'auth0|verified-admin',
        role: Role.SUPPORT_ADMIN,
      },
      include: { organization: true },
    });
  });

  it('refuses to link or activate a deactivated admin account', async () => {
    process.env.SUPPORT_ADMIN_EMAILS = 'admin@questedge.in';

    const deactivatedAdmin = {
      id: 'admin-user-uuid',
      auth0Sub: 'auth0|old-sub',
      email: 'admin@questedge.in',
      name: 'Admin User',
      role: Role.SUPPORT_ADMIN,
      isActive: false, // DEACTIVATED
      orgId: 'org-uuid',
      organization: { id: 'org-uuid', name: 'QuestEdge Platform' },
    };

    prismaMock.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(deactivatedAdmin);

    prismaMock.user.findFirst.mockResolvedValueOnce(null);

    await expect(
      authService.getMe('auth0|new-sub', 'admin@questedge.in', true),
    ).rejects.toThrow(UnauthorizedException);

    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('refuses access to an existing deactivated user found by sub', async () => {
    const deactivatedUser = {
      id: 'user-uuid',
      auth0Sub: 'auth0|deactivated-sub',
      email: 'user@example.com',
      role: Role.VIEWER,
      isActive: false,
      orgId: 'org-uuid',
      organization: { id: 'org-uuid', name: 'Some Org' },
    };

    prismaMock.user.findUnique.mockResolvedValueOnce(deactivatedUser);
    prismaMock.user.findFirst.mockResolvedValueOnce(null);

    await expect(
      authService.getMe('auth0|deactivated-sub', 'user@example.com', true),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('grants admin to subject in SUPPORT_ADMIN_SUBS even without email', async () => {
    process.env.SUPPORT_ADMIN_SUBS = 'auth0|trusted-root-admin';

    const existingUser = {
      id: 'root-admin-uuid',
      auth0Sub: 'auth0|trusted-root-admin',
      email: 'auth0|trusted-root-admin@placeholder.com',
      name: 'Root Admin',
      role: Role.ADMIN,
      isActive: true,
      orgId: 'org-uuid',
      organization: { id: 'org-uuid', name: 'Platform Org' },
    };

    prismaMock.user.findUnique.mockResolvedValueOnce(existingUser);
    prismaMock.user.findFirst.mockResolvedValueOnce(null);
    prismaMock.user.update.mockResolvedValueOnce({
      ...existingUser,
      role: Role.SUPPORT_ADMIN,
    });

    const result = await authService.getMe('auth0|trusted-root-admin');
    expect(result).toBeDefined();
    expect(result?.role).toBe(Role.SUPPORT_ADMIN);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'root-admin-uuid' },
      data: { role: Role.SUPPORT_ADMIN },
      include: { organization: true },
    });
  });
});
