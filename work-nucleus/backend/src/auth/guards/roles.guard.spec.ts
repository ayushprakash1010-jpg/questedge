import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, UserType } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let guard: RolesGuard;

  const makeContext = (user: any): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new RolesGuard(reflector);
  });

  it('denies demo account from company endpoints when persona is switched to RECRUITER', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce([Role.ADMIN])
      .mockReturnValueOnce([UserType.COMPANY_ADMIN, UserType.COMPANY_USER]);

    const allowed = guard.canActivate(
      makeContext({
        email: 'growytvercel@gmail.com',
        isDemoAccount: true,
        userType: UserType.RECRUITER,
      }),
    );

    expect(allowed).toBe(false);
  });

  it('denies VIEWER user when route requires ADMIN even for demo accounts', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce([Role.ADMIN])
      .mockReturnValueOnce([UserType.COMPANY_ADMIN, UserType.COMPANY_USER]);

    const allowed = guard.canActivate(
      makeContext({
        isDemoAccount: true,
        role: Role.VIEWER,
        userType: UserType.COMPANY_USER,
      }),
    );

    expect(allowed).toBe(false);
  });

  it('allows matching role and userType', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce([Role.ADMIN])
      .mockReturnValueOnce([UserType.COMPANY_ADMIN]);

    const allowed = guard.canActivate(
      makeContext({
        isDemoAccount: true,
        role: Role.ADMIN,
        userType: UserType.COMPANY_ADMIN,
      }),
    );

    expect(allowed).toBe(true);
  });
});
