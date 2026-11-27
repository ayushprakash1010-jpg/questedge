import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { DemoRoleInterceptor } from '../interceptors/demo-role.interceptor';

describe('JwtAuthGuard & DemoRoleInterceptor ordering', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.DEMO_EMAIL;
  });

  it('invokes demoRole.applyOverride inside JwtAuthGuard after parent auth succeeds', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const demoRole = {
      applyOverride: jest.fn().mockResolvedValue(undefined),
    } as unknown as DemoRoleInterceptor;

    const proto = Object.getPrototypeOf(JwtAuthGuard.prototype);
    const parentSpy = jest
      .spyOn(proto, 'canActivate')
      .mockResolvedValue(true);

    const guard = new JwtAuthGuard(reflector, demoRole);
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    const allowed = await guard.canActivate(ctx);

    expect(allowed).toBe(true);
    expect(parentSpy).toHaveBeenCalledWith(ctx);
    expect(demoRole.applyOverride).toHaveBeenCalledWith(ctx);
    expect(parentSpy.mock.invocationCallOrder[0]).toBeLessThan(
      (demoRole.applyOverride as jest.Mock).mock.invocationCallOrder[0],
    );
  });

  it('ignores X-Demo-Role override for regular non-demo accounts', async () => {
    const prismaMock = {
      user: { findFirst: jest.fn() },
      recruiterProfile: { findFirst: jest.fn() },
      candidateProfile: { findFirst: jest.fn() },
    };
    const interceptor = new DemoRoleInterceptor(prismaMock as any);

    const req = {
      user: {
        id: 'real-user-1',
        auth0Sub: 'auth0|real-user',
        email: 'jane@acme.com',
        isDemoAccount: false,
      },
      headers: {
        'x-demo-role': 'RECRUITER',
      },
    };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    await interceptor.applyOverride(ctx);

    expect(prismaMock.recruiterProfile.findFirst).not.toHaveBeenCalled();
    expect(req.user.id).toBe('real-user-1');
  });
});
