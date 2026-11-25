import { ConfigService } from '@nestjs/config';
import { ManagementClient } from 'auth0';
import {
  buildTrustedAuth0Issuers,
  normalizeAuth0Domain,
  resolveTrustedUserInfoOrigin,
} from './auth0-domain.util';
import { Auth0ManagementService } from './auth0-management.service';

jest.mock('auth0', () => ({
  ManagementClient: jest.fn().mockImplementation(() => ({
    users: { create: jest.fn(), update: jest.fn() },
    tickets: { changePassword: jest.fn() },
  })),
}));

describe('Auth0 custom domain utilities', () => {
  it('normalizes domains by stripping protocol, slashes, and whitespace', () => {
    expect(normalizeAuth0Domain('  https://auth.questedge.in/  ')).toBe(
      'auth.questedge.in',
    );
    expect(normalizeAuth0Domain('http://dev-123.us.auth0.com///')).toBe(
      'dev-123.us.auth0.com',
    );
    expect(normalizeAuth0Domain(undefined)).toBe('');
  });

  it('builds deduplicated trusted issuers for custom and canonical domains', () => {
    expect(
      buildTrustedAuth0Issuers(
        'auth.questedge.in',
        'dev-exmwtl2j62uy00k1.us.auth0.com',
      ),
    ).toEqual([
      'https://auth.questedge.in/',
      'https://dev-exmwtl2j62uy00k1.us.auth0.com/',
    ]);

    expect(
      buildTrustedAuth0Issuers(
        'https://auth.questedge.in/',
        'auth.questedge.in',
      ),
    ).toEqual(['https://auth.questedge.in/']);
  });

  it('resolves /userinfo only against configured trusted Auth0 domains', () => {
    expect(
      resolveTrustedUserInfoOrigin(
        'https://dev-exmwtl2j62uy00k1.us.auth0.com/',
        'auth.questedge.in',
        'dev-exmwtl2j62uy00k1.us.auth0.com',
      ),
    ).toBe('https://dev-exmwtl2j62uy00k1.us.auth0.com');

    expect(
      resolveTrustedUserInfoOrigin(
        'https://evil.example.com/',
        'auth.questedge.in',
        'dev-exmwtl2j62uy00k1.us.auth0.com',
      ),
    ).toBe('https://auth.questedge.in');
  });
});

describe('Auth0ManagementService', () => {
  const mockedClient = ManagementClient as unknown as jest.Mock;

  beforeEach(() => {
    mockedClient.mockClear();
  });

  it('uses AUTH0_MANAGEMENT_DOMAIN and canonical audience when custom AUTH0_DOMAIN is set', () => {
    const configValues: Record<string, string> = {
      AUTH0_DOMAIN: 'https://auth.questedge.in/',
      AUTH0_MANAGEMENT_DOMAIN: 'dev-exmwtl2j62uy00k1.us.auth0.com',
      AUTH0_MANAGEMENT_CLIENT_ID: 'mgmt-client-id',
      AUTH0_MANAGEMENT_CLIENT_SECRET: 'mgmt-client-secret',
    };
    const configService = {
      get: jest.fn((key: string) => configValues[key]),
      getOrThrow: jest.fn((key: string) => {
        if (!configValues[key]) {
          throw new Error(`Missing ${key}`);
        }
        return configValues[key];
      }),
    } as unknown as ConfigService;

    const service = new Auth0ManagementService(configService);
    service.onModuleInit();

    expect(mockedClient).toHaveBeenCalledWith({
      domain: 'dev-exmwtl2j62uy00k1.us.auth0.com',
      audience: 'https://dev-exmwtl2j62uy00k1.us.auth0.com/api/v2/',
      clientId: 'mgmt-client-id',
      clientSecret: 'mgmt-client-secret',
    });
  });

  it('falls back to AUTH0_DOMAIN when AUTH0_MANAGEMENT_DOMAIN is unset', () => {
    const configValues: Record<string, string> = {
      AUTH0_DOMAIN: 'dev-exmwtl2j62uy00k1.us.auth0.com',
      AUTH0_MANAGEMENT_CLIENT_ID: 'mgmt-client-id',
      AUTH0_MANAGEMENT_CLIENT_SECRET: 'mgmt-client-secret',
    };
    const configService = {
      get: jest.fn((key: string) => configValues[key]),
      getOrThrow: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;

    const service = new Auth0ManagementService(configService);
    service.onModuleInit();

    expect(mockedClient).toHaveBeenCalledWith({
      domain: 'dev-exmwtl2j62uy00k1.us.auth0.com',
      audience: 'https://dev-exmwtl2j62uy00k1.us.auth0.com/api/v2/',
      clientId: 'mgmt-client-id',
      clientSecret: 'mgmt-client-secret',
    });
  });
});
