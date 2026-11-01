import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';
import { PrismaService } from './prisma/prisma.service';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { validateEnvironment } from './config/env.validation';

async function bootstrap() {
  // P0-09: Fail-fast boot-time environment validation
  validateEnvironment();

  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const logger = new Logger('Bootstrap');
  const isProduction = process.env.NODE_ENV === 'production';

  // P1-04: Trust reverse proxy (Render, Vercel, ALB) & disable server fingerprinting
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);
  expressApp.disable('x-powered-by');

  // P1-04: Security headers middleware
  app.use((_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (isProduction) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
    }
    next();
  });

  // Capture raw body on every JSON request so webhook HMAC verification has access
  app.use(
    express.json({
      limit: '5mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));

  // Global validation pipe — reject unknown fields to prevent mass-assignment
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true, // P0-09: reject unknown fields
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global logging interceptor (with request ID and redaction)
  app.useGlobalInterceptors(new LoggingInterceptor());

  // CORS — allow both local dev origins and production Vercel deployments
  app.enableCors({
    origin: [
      'http://localhost:3001', // frontend (dev)
      'http://localhost:3002', // support-admin (dev)
      'https://questedge.vercel.app', // production frontend
      'https://questedge-admin.vercel.app', // production support-admin
      // Add additional preview/staging URLs as needed:
      ...(process.env.EXTRA_CORS_ORIGINS
        ? process.env.EXTRA_CORS_ORIGINS.split(',')
        : []),
    ],
    credentials: true,
  });

  // P1-04: Gate Swagger — enabled in dev or when explicitly opted in via ENABLE_SWAGGER=true
  const enableSwagger = !isProduction || process.env.ENABLE_SWAGGER === 'true';
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('QuestEdge API')
      .setDescription('QuestEdge HR Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger documentation enabled at /api/docs');
  } else {
    logger.log('Swagger documentation disabled in production (set ENABLE_SWAGGER=true to override)');
  }

  // Auto-provision & trim demo account on boot if DEMO_AUTH0_SUB is provided
  const demoSub = process.env.DEMO_AUTH0_SUB?.trim();
  const demoEmail = process.env.DEMO_EMAIL?.trim().toLowerCase();
  if (demoSub && demoEmail) {
    try {
      const prisma = app.get(PrismaService);
      // Ensure existing records with trailing newlines are trimmed
      await prisma.user.updateMany({
        where: { email: demoEmail, isDemoAccount: true },
        data: { auth0Sub: demoSub },
      });
      await prisma.recruiterProfile.updateMany({
        where: { isDemoAccount: true },
        data: { auth0Sub: demoSub },
      });
      await prisma.candidateProfile.updateMany({
        where: { isDemoAccount: true },
        data: { auth0Sub: demoSub },
      });

      const authService = app.get(AuthService);
      await authService.provisionDemo(demoSub, demoEmail, {
        orgName: process.env.DEMO_ORG_NAME ?? 'QuestEdge Demo Corp',
        industry: 'Technology',
        name: process.env.DEMO_NAME ?? 'Demo Admin',
      });
      logger.log(`Demo account auto-provisioned for ${demoEmail} (sub: ${demoSub})`);
    } catch (err: any) {
      if (err.status === 409) {
        logger.log(`Demo account already provisioned (${demoEmail})`);
      } else {
        logger.warn(`Demo account auto-provision notice: ${err.message}`);
      }
    }
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}`);
}
bootstrap();
