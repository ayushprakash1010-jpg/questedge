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

    // Cache service: HotCacheService actively uses in-memory LRU map storage
    const redisStatus = 'in-memory';

    // Storage service: verify whether S3 / object storage credentials exist
    const hasS3Config = Boolean(
      (process.env.S3_BUCKET || process.env.AWS_BUCKET_NAME) &&
      (process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID || process.env.AWS_REGION),
    );
    const storageStatus = hasS3Config ? 'configured' : 'not_configured';

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
