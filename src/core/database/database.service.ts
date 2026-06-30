import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as argon2 from 'argon2';

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
        // Exclude system warm-up / heartbeat checks from slow query logs
        if (e.duration > 100 && !e.query.includes('SELECT 1')) {
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

      // Pre-warm the PostgreSQL connection pool to avoid cold-start latencies
      await this.$queryRawUnsafe('SELECT 1');
      this.logger.debug('Database connection pool pre-warmed.');

      await this.seedSuperAdmin();
    } catch (error) {
      this.logger.error(
        `Prisma connection failure during initialization: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async seedSuperAdmin() {
    const phone = this.configService.get<string>('SUPERADMIN_PHONE');
    const email = this.configService.get<string>('SUPERADMIN_EMAIL');
    const password = this.configService.get<string>('SUPERADMIN_PASSWORD');
    const name = this.configService.get<string>('SUPERADMIN_NAME');

    if (!phone || !email || !password || !name) {
      this.logger.warn(
        'Super Admin init credentials missing from environment. Skipping seed.',
      );
      return;
    }

    try {
      // Optimize query to use point-lookups (O(1) index seeks) instead of OR filters
      let existingSuperAdmin = await this.user.findUnique({
        where: { phone },
      });

      if (!existingSuperAdmin && email) {
        existingSuperAdmin = await this.user.findUnique({
          where: { email },
        });
      }

      if (existingSuperAdmin) {
        this.logger.log(
          'Super Admin user already exists. Skipping initialization.',
        );
        return;
      }

      const hashedPassword = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
      });

      await this.user.create({
        data: {
          phone,
          email,
          password: hashedPassword,
          name,
          roles: [Role.SUPER_ADMIN],
        },
      });

      this.logger.log('Super Admin user successfully initialized.');
    } catch (error) {
      this.logger.error(
        `Failed to seed Super Admin: ${error.message}`,
        error.stack,
      );
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
