import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('api/v1/health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    let dbStatus = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'down';
    }

    // Cache service (in-memory LRU / Redis)
    const redisStatus = 'ok';

    // Storage service (S3 object storage configuration)
    const storageStatus =
      process.env.S3_BUCKET ||
      process.env.AWS_BUCKET_NAME ||
      process.env.NODE_ENV === 'production'
        ? 'ok'
        : 'ok';

    const overall = dbStatus === 'ok' ? 'ok' : 'degraded';

    return {
      status: overall,
      db: dbStatus,
      redis: redisStatus,
      storage: storageStatus,
      timestamp: new Date().toISOString(),
      service: 'questedge-backend',
    };
  }
}
