import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';

describe('UsersService admin protections on deactivate', () => {
  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };
  const mockAuth0 = {
    blockUser: jest.fn(),
  };

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(mockPrisma as any, mockAuth0 as any);
  });

  it('blocks an admin from deactivating themselves', async () => {
    await expect(
      service.remove('org-1', 'user-1', 'user-1'),
    ).rejects.toThrow(ForbiddenException);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('blocks deactivating the last active admin in an organization', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'user-2',
      orgId: 'org-1',
      role: Role.ADMIN,
      isActive: true,
      auth0Sub: 'auth0|u2',
      email: 'admin@org.com',
    });
    mockPrisma.user.count.mockResolvedValue(1);

    await expect(
      service.remove('org-1', 'user-2', 'user-1'),
    ).rejects.toThrow(ForbiddenException);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('allows deactivating an admin when another active admin exists', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'user-2',
      orgId: 'org-1',
      role: Role.ADMIN,
      isActive: true,
      auth0Sub: 'auth0|u2',
      email: 'admin2@org.com',
    });
    mockPrisma.user.count.mockResolvedValue(2);
    mockPrisma.user.update.mockResolvedValue({});
    mockAuth0.blockUser.mockResolvedValue(undefined);

    const res = await service.remove('org-1', 'user-2', 'user-1');

    expect(res).toEqual({ message: 'User deactivated' });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      data: { isActive: false },
    });
  });
});
