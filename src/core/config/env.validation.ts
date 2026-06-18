import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Provision = 'provision',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNotEmpty()
  @IsString()
  DATABASE_URL: string;

  @IsNotEmpty()
  @IsString()
  JWT_SECRET: string;

  @IsNotEmpty()
  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  JWT_EXPIRATION: string = '1h';

  @IsString()
  JWT_REFRESH_EXPIRATION: string = '7d';

  @IsNotEmpty()
  @IsString()
  REDIS_HOST: string;
  @IsNumber()
  REDIS_PORT: number = 6379;

  @IsOptional()
  @IsString()
  QUEUE_REDIS_HOST: string = 'localhost';
  @IsOptional()
  @IsNumber()
  QUEUE_REDIS_PORT: number = 6379;

  @IsNotEmpty()
  @IsString()
  SMTP_HOST: string;

  @IsNotEmpty()
  @IsNumber()
  SMTP_PORT: number = 587;

  @IsNotEmpty()
  @IsString()
  SMTP_USER: string;

  @IsNotEmpty()
  @IsString()
  SMTP_PASS: string;

  @IsOptional()
  @IsString()
  SMTP_FROM: string;

  @IsNotEmpty()
  @IsString()
  SUPERADMIN_PHONE: string;

  @IsNotEmpty()
  @IsString()
  SUPERADMIN_EMAIL: string;

  @IsNotEmpty()
  @IsString()
  SUPERADMIN_PASSWORD: string;

  @IsNotEmpty()
  @IsString()
  SUPERADMIN_NAME: string;
}


export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
