import {
  hasUndefinedTenantId,
  findUndefinedTenantId,
  createTenantSafetyExtension,
  TenantSafetyError,
} from './prisma.service';

describe('Prisma Tenant Safety Net (P1-03)', () => {
  describe('hasUndefinedTenantId', () => {
    it('should return true when orgId is undefined directly', () => {
      expect(hasUndefinedTenantId({ orgId: undefined })).toBe(true);
      expect(hasUndefinedTenantId({ orgId: undefined, status: 'ACTIVE' })).toBe(true);
    });

    it('should return true when orgId is nested inside a relation', () => {
      expect(
        hasUndefinedTenantId({
          id: '123',
          hiringPlan: { orgId: undefined },
        }),
      ).toBe(true);

      expect(
        hasUndefinedTenantId({
          candidate: {
            organization: { orgId: undefined },
          },
        }),
      ).toBe(true);
    });

    it('should return true when orgId is in an AND/OR array', () => {
      expect(
        hasUndefinedTenantId({
          AND: [{ status: 'ACTIVE' }, { orgId: undefined }],
        }),
      ).toBe(true);

      expect(
        hasUndefinedTenantId({
          OR: [{ orgId: undefined }, { status: 'PENDING' }],
        }),
      ).toBe(true);
    });

    it('should return true when orgId filter object has undefined value', () => {
      expect(hasUndefinedTenantId({ orgId: { equals: undefined } })).toBe(true);
      expect(hasUndefinedTenantId({ orgId: { in: undefined } })).toBe(true);
    });

    it('should return false for valid tenant queries', () => {
      expect(
        hasUndefinedTenantId({ orgId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' }),
      ).toBe(false);

      expect(
        hasUndefinedTenantId({
          orgId: { in: ['a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'] },
        }),
      ).toBe(false);
    });

    it('should return false for legitimate unscoped marketplace queries', () => {
      expect(hasUndefinedTenantId({ status: 'ACTIVE' })).toBe(false);
      expect(hasUndefinedTenantId({})).toBe(false);
      expect(hasUndefinedTenantId(null)).toBe(false);
      expect(hasUndefinedTenantId(undefined)).toBe(false);
    });

    it('should return false when orgId is explicitly null', () => {
      expect(hasUndefinedTenantId({ orgId: null })).toBe(false);
    });

    it('should safely handle Date, RegExp, and primitive fields without crashing', () => {
      expect(
        hasUndefinedTenantId({
          createdAt: new Date(),
          title: { contains: 'Engineer', mode: 'insensitive' },
        }),
      ).toBe(false);
    });
  });

  describe('findUndefinedTenantId', () => {
    it('should detect orgId: undefined in top-level where', () => {
      expect(findUndefinedTenantId({ where: { orgId: undefined } })).toBe(true);
    });

    it('should detect orgId: undefined in nested relation include where', () => {
      expect(
        findUndefinedTenantId({
          include: {
            mandates: {
              where: { orgId: undefined },
            },
          },
        }),
      ).toBe(true);
    });

    it('should detect orgId: undefined in nested relation select where', () => {
      expect(
        findUndefinedTenantId({
          select: {
            applications: {
              where: { hiringPlan: { orgId: undefined } },
            },
          },
        }),
      ).toBe(true);
    });

    it('should return false when where has valid orgId', () => {
      expect(
        findUndefinedTenantId({
          where: { orgId: 'valid-tenant-id' },
          include: { mandates: true },
        }),
      ).toBe(false);
    });
  });

  describe('createTenantSafetyExtension', () => {
    it('should intercept operations with undefined orgId and throw TenantSafetyError', async () => {
      const extension = createTenantSafetyExtension();
      const mockQuery = jest.fn().mockResolvedValue({ id: '123' });

      await expect(
        extension.query.$allModels.$allOperations({
          model: 'Mandate',
          operation: 'findMany',
          args: { where: { orgId: undefined } },
          query: mockQuery,
        }),
      ).rejects.toThrow(TenantSafetyError);

      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should allow queries with valid tenant scoping to proceed to query()', async () => {
      const extension = createTenantSafetyExtension();
      const mockQuery = jest.fn().mockResolvedValue([{ id: '123' }]);

      const result = await extension.query.$allModels.$allOperations({
        model: 'Mandate',
        operation: 'findMany',
        args: { where: { orgId: 'tenant-123', status: 'ACTIVE' } },
        query: mockQuery,
      });

      expect(mockQuery).toHaveBeenCalledWith({
        where: { orgId: 'tenant-123', status: 'ACTIVE' },
      });
      expect(result).toEqual([{ id: '123' }]);
    });
  });
});
