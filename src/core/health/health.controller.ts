import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../database/database.service';
import { RedisService } from '../cache/redis.service';
import { HealthCheckSuccessResponseDto } from './dto/health-response.dto';

@ApiTags('System')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'System health check',
    description:
      'Verifies connection status of vital infrastructure components, including PostgreSQL database and Redis cache.',
  })
  @ApiResponse({
    status: 200,
    description: 'System components are fully operational.',
    type: HealthCheckSuccessResponseDto,
  })
  async check() {
    // Check DB
    await this.prisma.$queryRaw`SELECT 1`;
    // Check Redis
    await this.redis.getClient().ping();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        redis: 'up',
      },
    };
  }
}
