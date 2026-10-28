import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

const DANGEROUS_DEV_SECRETS = [
  'dev-webhook-secret',
  'dev-internal-key',
  'dev-msg91-secret',
  'rzp_test_dummy_key',
  'dummy-key',
];

/**
 * Boot-time environment validation (P0-09 / C-06 / F-10).
 * Fails fast on production startup if critical configuration is missing or uses insecure dev defaults.
 */
export function validateEnvironment(): void {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    logger.log('Running in non-production environment. Insecure defaults allowed for local development.');
    return;
  }

  logger.log('Validating production environment configuration...');
  const errors: string[] = [];

  // 1. Critical infrastructure vars
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') {
    errors.push('DATABASE_URL is required in production.');
  }

  if (!process.env.AUTH0_DOMAIN || process.env.AUTH0_DOMAIN.trim() === '') {
    errors.push('AUTH0_DOMAIN is required in production.');
  }

  if (!process.env.AUTH0_AUDIENCE || process.env.AUTH0_AUDIENCE.trim() === '') {
    errors.push('AUTH0_AUDIENCE is required in production.');
  }

  // 2. Reject dev-* placeholders in production
  const secretChecks = [
    { name: 'DIGIO_WEBHOOK_SECRET', val: process.env.DIGIO_WEBHOOK_SECRET },
    { name: 'AUTHBRIDGE_WEBHOOK_SECRET', val: process.env.AUTHBRIDGE_WEBHOOK_SECRET },
    { name: 'MSG91_WEBHOOK_SECRET', val: process.env.MSG91_WEBHOOK_SECRET },
    { name: 'INTERNAL_API_KEY', val: process.env.INTERNAL_API_KEY },
  ];

  for (const { name, val } of secretChecks) {
    if (val && DANGEROUS_DEV_SECRETS.includes(val.trim())) {
      errors.push(
        `${name} cannot use placeholder dev value "${val}" in production. Set a unique, secure secret.`,
      );
    }
  }

  // 3. Recommended / Warning checks
  if (!process.env.SUPPORT_ADMIN_SUBS || process.env.SUPPORT_ADMIN_SUBS.trim() === '') {
    logger.warn(
      '⚠️ SUPPORT_ADMIN_SUBS is not set in production. No platform support admins will be recognized until configured.',
    );
  }

  if (!process.env.FRONTEND_URL || process.env.FRONTEND_URL.trim() === '') {
    logger.warn(
      '⚠️ FRONTEND_URL is not set in production. Outgoing email links may default to fallback URL.',
    );
  }

  if (errors.length > 0) {
    logger.error('╔══════════════════════════════════════════════════════════════╗');
    logger.error('║ PRODUCTION ENVIRONMENT CONFIGURATION FAILED VALIDATION       ║');
    logger.error('╚══════════════════════════════════════════════════════════════╝');
    for (const err of errors) {
      logger.error(` ❌ ${err}`);
    }
    throw new Error(
      `Production startup aborted due to ${errors.length} configuration error(s). See logs above.`,
    );
  }

  logger.log('✅ Production environment configuration passed validation.');
}
