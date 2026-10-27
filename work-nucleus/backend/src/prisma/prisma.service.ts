import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export class TenantSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantSafetyError';
  }
}

/**
 * Recursively scans an object for accidental `orgId: undefined` leaks.
 * When Prisma encounters `orgId: undefined` in a `where` clause, it silently strips
 * the filter from the generated SQL, inadvertently converting a tenant-specific query
 * into a full-table query across all tenants.
 */
export function hasUndefinedTenantId(obj: any): boolean {
  if (
    !obj ||
    typeof obj !== 'object' ||
    obj instanceof Date ||
    obj instanceof RegExp ||
    Buffer.isBuffer(obj)
  ) {
    return false;
  }

  if ('orgId' in obj) {
    if (obj.orgId === undefined) return true;
    if (obj.orgId && typeof obj.orgId === 'object') {
      if ('equals' in obj.orgId && obj.orgId.equals === undefined) return true;
      if ('in' in obj.orgId && obj.orgId.in === undefined) return true;
    }
  }

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === 'object') {
      if (Array.isArray(val)) {
        for (const item of val) {
          if (hasUndefinedTenantId(item)) return true;
        }
      } else {
        if (hasUndefinedTenantId(val)) return true;
      }
    }
  }

  return false;
}

/**
 * Checks query args for `orgId: undefined` in top-level `where` or nested relation filters.
 */
export function findUndefinedTenantId(args: any): boolean {
  if (!args || typeof args !== 'object') return false;

  // Check top-level where
  if (args.where && hasUndefinedTenantId(args.where)) {
    return true;
  }

  // Check nested relation includes with where filters
  if (args.include && typeof args.include === 'object') {
    for (const key of Object.keys(args.include)) {
      const relVal = args.include[key];
      if (relVal && typeof relVal === 'object' && relVal.where) {
        if (hasUndefinedTenantId(relVal.where)) return true;
      }
    }
  }

  // Check nested relation selects with where filters
  if (args.select && typeof args.select === 'object') {
    for (const key of Object.keys(args.select)) {
      const relVal = args.select[key];
      if (relVal && typeof relVal === 'object' && relVal.where) {
        if (hasUndefinedTenantId(relVal.where)) return true;
      }
    }
  }

  return false;
}

export function createTenantSafetyExtension() {
  const logger = new Logger('TenantSafetyNet');

  return {
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          if (findUndefinedTenantId(args)) {
            const errorMsg = `[TenantSafetyNet] Cross-tenant leak prevented! Query on ${model}.${operation} passed 'orgId: undefined' in where clause.`;
            logger.error(errorMsg);
            throw new TenantSafetyError(errorMsg);
          }
          return query(args);
        },
      },
    },
  };
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly extendedClient: any;

  constructor() {
    super();
    this.extendedClient = this.$extends(createTenantSafetyExtension());
    return new Proxy(this, {
      get: (target: any, prop: string | symbol) => {
        // If property exists on extended client (e.g. models, $transaction, $connect), prefer extended
        if (prop in target.extendedClient) {
          const val = target.extendedClient[prop];
          if (typeof val === 'function') {
            return val.bind(target.extendedClient);
          }
          return val;
        }
        return target[prop];
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
