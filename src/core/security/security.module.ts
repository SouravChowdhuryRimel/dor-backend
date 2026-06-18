import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisHost = config.get<string>('redis.host', 'localhost');
        const redisPort = config.get<number>('redis.port', 6379);

        // Instantiate a dedicated, fault-tolerant Redis connection for rate-limiting
        const redisClient = new Redis({
          host: redisHost,
          port: redisPort,
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 100, 3000),
        });

        redisClient.on('error', (err) => {
          console.error(
            'Throttler Redis Client Connection Failure:',
            err.message,
          );
        });

        return [
          {
            ttl: 60000, // 1 minute
            limit: config.get<number>('RATE_LIMIT_PER_MIN', 100),
            storage: new ThrottlerStorageRedisService(redisClient),
          },
        ];
      },
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class SecurityModule {}
