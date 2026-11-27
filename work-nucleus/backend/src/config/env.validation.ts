import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

const DANGEROUS_DEV_SECRETS = new Set([
  'dev-webhook-secret',
  'dev-internal-key',
  'dev-msg91-secret',
  'rzp_test_dummy_key',
  'dummy-key',
]);

function isLocalhostUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|minio)(:\d+)?(\/|$)/i.test(url.trim());
}

/**
 * Boot-time environment validation.
 * Fails fast on production startup if critical configuration is missing,
 * uses insecure dev defaults, or leaves webhooks unauthenticated while
 * vendor credentials are configured.
 */
export function validateEnvironment(): void {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    logger.log(
      'Running in non-production environment. Local development defaults permitted.',
    );
    return;
  }

  logger.log('Validating production environment configuration...');
  const errors: string[] = [];

  // 1. Critical infrastructure vars
  if (!process.env.DATABASE_URL?.trim()) {
    errors.push('DATABASE_URL is required in production.');
  }

  if (!process.env.AUTH0_DOMAIN?.trim()) {
    errors.push('AUTH0_DOMAIN is required in production.');
  }

  if (!process.env.AUTH0_AUDIENCE?.trim()) {
    errors.push('AUTH0_AUDIENCE is required in production.');
  }

  if (process.env.FRONTEND_URL?.trim()) {
    try {
      const parsed = new URL(process.env.FRONTEND_URL.trim());
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        errors.push('FRONTEND_URL must use http:// or https://.');
      }
    } catch {
      errors.push('FRONTEND_URL must be a valid URL.');
    }
  } else {
    logger.warn(
      'FRONTEND_URL is not set in production. Outgoing notification emails will omit deep links.',
    );
  }

  // 2. Reject insecure placeholder secrets in production
  const secretChecks = [
    { name: 'DIGIO_WEBHOOK_SECRET', val: process.env.DIGIO_WEBHOOK_SECRET },
    { name: 'AUTHBRIDGE_WEBHOOK_SECRET', val: process.env.AUTHBRIDGE_WEBHOOK_SECRET },
    { name: 'MSG91_WEBHOOK_SECRET', val: process.env.MSG91_WEBHOOK_SECRET },
    { name: 'INTERNAL_API_KEY', val: process.env.INTERNAL_API_KEY },
    { name: 'AUTH0_SYNC_SECRET', val: process.env.AUTH0_SYNC_SECRET },
  ];

  for (const { name, val } of secretChecks) {
    if (val && DANGEROUS_DEV_SECRETS.has(val.trim())) {
      errors.push(
        `${name} cannot use placeholder dev value "${val}" in production. Set a unique, secure secret.`,
      );
    }
  }

  // 3. Enforce webhook secrets when vendor integration keys are enabled
  if (
    process.env.DIGIO_CLIENT_ID?.trim() &&
    !process.env.DIGIO_WEBHOOK_SECRET?.trim()
  ) {
    errors.push(
      'DIGIO_WEBHOOK_SECRET is required when DIGIO_CLIENT_ID is configured.',
    );
  }

  if (
    process.env.AUTHBRIDGE_API_KEY?.trim() &&
    !process.env.AUTHBRIDGE_WEBHOOK_SECRET?.trim()
  ) {
    errors.push(
      'AUTHBRIDGE_WEBHOOK_SECRET is required when AUTHBRIDGE_API_KEY is configured.',
    );
  }

  if (
    process.env.MSG91_AUTH_KEY?.trim() &&
    !process.env.MSG91_WEBHOOK_SECRET?.trim()
  ) {
    errors.push(
      'MSG91_WEBHOOK_SECRET is required when MSG91_AUTH_KEY is configured.',
    );
  }

  // 4. S3 storage credential hygiene
  const s3Endpoint = process.env.S3_ENDPOINT?.trim();
  if (s3Endpoint && !isLocalhostUrl(s3Endpoint)) {
    const s3Access = process.env.S3_ACCESS_KEY?.trim() || process.env.AWS_ACCESS_KEY_ID?.trim();
    const s3Secret = process.env.S3_SECRET_KEY?.trim() || process.env.AWS_SECRET_ACCESS_KEY?.trim();
    if (!s3Access || !s3Secret) {
      errors.push(
        'S3_ACCESS_KEY and S3_SECRET_KEY (or AWS_*) are required when S3_ENDPOINT is configured in production.',
      );
    } else if (s3Access === 'minioadmin' || s3Secret === 'minioadmin') {
      errors.push(
        'S3_ACCESS_KEY / S3_SECRET_KEY cannot use minioadmin defaults in production.',
      );
    }
  }

  // 5. Recommended / Operational warnings
  if (
    !process.env.SUPPORT_ADMIN_SUBS?.trim() &&
    !process.env.SUPPORT_ADMIN_EMAILS?.trim()
  ) {
    logger.warn(
      'SUPPORT_ADMIN_SUBS and SUPPORT_ADMIN_EMAILS are empty. No platform support admins will be recognized.',
    );
  }

  if (
    !process.env.RESEND_API_KEY?.trim() &&
    !process.env.SENDGRID_API_KEY?.trim()
  ) {
    logger.warn(
      'Neither RESEND_API_KEY nor SENDGRID_API_KEY is set in production. Transactional emails and BGV Email OTPs will fail.',
    );
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    logger.warn(
      'GEMINI_API_KEY is not set in production. AI JD/scoring/summary endpoints will return unavailable errors.',
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

  logger.log('Production environment configuration passed validation.');
}
