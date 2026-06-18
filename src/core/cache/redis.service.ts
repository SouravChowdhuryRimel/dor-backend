import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('redis.host') || 'localhost';
    const port = this.configService.get<number>('redis.port') || 6379;

    this.logger.log(`Initializing Redis client on ${host}:${port}`);

    this.client = new Redis({
      host,
      port,
      maxRetriesPerRequest: null,
    });

    this.client.on('connect', () => {
      this.logger.log('Redis client successfully connected');
    });

    this.client.on('error', (error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Redis GET error for key "${key}": ${error.message}`);
      throw error;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<'OK'> {
    try {
      if (ttl) {
        return await this.client.set(key, value, 'EX', ttl);
      }
      return await this.client.set(key, value);
    } catch (error) {
      this.logger.error(`Redis SET error for key "${key}": ${error.message}`);
      throw error;
    }
  }

  async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      this.logger.error(`Redis DEL error for key "${key}": ${error.message}`);
      throw error;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const data = await this.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(
        `Redis JSON parse error for key "${key}": ${error.message}`,
      );
      return null;
    }
  }

  async setJson(key: string, value: any, ttl?: number): Promise<'OK'> {
    try {
      return await this.set(key, JSON.stringify(value), ttl);
    } catch (error) {
      this.logger.error(
        `Redis JSON stringify error for key "${key}": ${error.message}`,
      );
      throw error;
    }
  }

  getClient(): Redis {
    return this.client;
  }
}
