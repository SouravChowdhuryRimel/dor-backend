import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsArray,
} from 'class-validator';

export class CreateAdminDto {
  @ApiPropertyOptional({
    description: 'Email address of the admin',
    example: 'admin@example.com',
    format: 'email',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Unique phone number of the admin',
    example: '01712345678',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: 'Secure password for the admin account (minimum 6 characters)',
    example: 'SecurePass123!',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    description: 'Full name of the admin',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'List of Category IDs to associate this admin with (multiple)',
    example: ['uuid-string'],
    type: [String],
  })
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined;
    if (Array.isArray(value)) {
      return value
        .flatMap((v) =>
          typeof v === 'string'
            ? v
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : v,
        )
        .filter(Boolean);
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.map((s) => String(s).trim()).filter(Boolean);
        }
      } catch {
        // Not a JSON array, treat as comma-separated
      }
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [value];
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];

  @ApiPropertyOptional({
    description: 'Whether the admin account can sign in',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
