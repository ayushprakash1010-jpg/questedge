import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as crypto from 'crypto';

const SENSITIVE_QUERY_PARAMS = [
  'token',
  'secret',
  'key',
  'apikey',
  'api_key',
  'password',
  'pass',
  'code',
  'access_token',
  'refresh_token',
  'auth',
  'authorization',
];

/**
 * Sanitizes URLs to prevent credentials/tokens from being leaked into log collectors (P1-05).
 */
function sanitizeUrl(rawUrl: string): string {
  try {
    const [path, queryString] = rawUrl.split('?');
    if (!queryString) return path;

    const params = new URLSearchParams(queryString);
    for (const key of params.keys()) {
      if (SENSITIVE_QUERY_PARAMS.some((s) => key.toLowerCase().includes(s))) {
        params.set(key, '[REDACTED]');
      }
    }
    return `${path}?${params.toString()}`;
  } catch {
    return rawUrl;
  }
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    // P1-05: Propagate or generate unique request ID
    const requestId =
      (req.headers['x-request-id'] as string) || crypto.randomUUID();
    req.id = requestId;
    res.setHeader('x-request-id', requestId);

    const { method, url } = req;
    const sanitizedPath = sanitizeUrl(url);
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - now;
          const userMeta = req.user
            ? ` [org:${req.user.orgId || 'none'} user:${req.user.id || 'anon'}]`
            : '';
          this.logger.log(
            `[${requestId}] ${method} ${sanitizedPath} ${res.statusCode} - ${duration}ms${userMeta}`,
          );
        },
        error: (err) => {
          const duration = Date.now() - now;
          const status = err?.status || err?.statusCode || 500;
          this.logger.warn(
            `[${requestId}] ${method} ${sanitizedPath} ${status} - ${duration}ms - ${err.message || 'Error'}`,
          );
        },
      }),
    );
  }
}
