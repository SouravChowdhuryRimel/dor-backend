import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsEmail, IsArray, ValidateIf } from 'class-validator';

export class UpdateAdminDto {
  @ApiPropertyOptional({
    description: 'Email address of the admin',
    example: 'admin@example.com',
    format: 'email',
  })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @ValidateIf((o) => o.email !== undefined && o.email !== null && o.email !== '')
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Full name of the admin',
    example: 'John Doe',
  })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Profile image of the admin (file upload)',
    type: 'string',
    format: 'binary',
  })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  profileImage?: any;

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
            ? v.split(',').map((s) => s.trim()).filter(Boolean)
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
      return value.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [value];
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];
}

