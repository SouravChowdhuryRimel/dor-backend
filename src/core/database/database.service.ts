import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private pool: Pool;

  constructor(private configService: ConfigService) {
    const connectionString = configService.get<string>('database.url');

    // Configure robust high-concurrency pool parameters
    const pool = new Pool({
      connectionString,
      max: configService.get<number>('DB_POOL_MAX', 20), // Connection limit per application instance
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      this.logger.error(
        `Database connection pool critical error: ${err.message}`,
        err.stack,
      );
    });

    const adapter = new PrismaPg(pool);

    // Initialize Prisma Client with PgAdapter and query instrumentation
    super({
      adapter,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
      ],
    });
    this.pool = pool;

    // Track and warn on slow queries (> 100ms) for high-scale visibility
    if (process.env.NODE_ENV !== 'production') {
      (this as any).$on('query', (e: any) => {
        if (e.duration > 100) {
          this.logger.warn(
            `Slow Database Query Detected: ${e.query} - Duration: ${e.duration}ms`,
          );
        }
      });
    }

    (this as any).$on('error', (e: any) => {
      this.logger.error(`Prisma Engine Internal Error: ${e.message}`);
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log(
        'Prisma Engine database connections successfully established.',
      );
    } catch (error) {
      this.logger.error(
        `Prisma connection failure during initialization: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      await this.pool.end();
      this.logger.log('Prisma PG Pool connections successfully released.');
    } catch (error) {
      this.logger.error(
        `Prisma pool termination error: ${error.message}`,
        error.stack,
      );
    }
  }
}
