import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsEmail, IsArray } from 'class-validator';

export class UpdateAdminDto {
  @ApiPropertyOptional({
    description: 'Email address of the admin',
    example: 'admin@example.com',
    format: 'email',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Full name of the admin',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Profile image of the admin (file upload)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  profileImage?: any;

  @ApiPropertyOptional({
    description: 'List of Category IDs to associate this admin with (multiple)',
    example: ['uuid-string'],
    type: [String],
  })
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined;
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];
}
