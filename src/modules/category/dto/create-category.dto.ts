import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum CategoryStatusDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class CreateCategoryDto {
  @ApiProperty({ description: 'The name of the category' })
  @IsString()
  @IsNotEmpty()
  categoryName: string;

  @ApiPropertyOptional({ description: 'Category thumbnail URL or path' })
  @IsString()
  @IsOptional()
  categoryThumbnail?: string;

  @ApiPropertyOptional({
    description: 'IDs of admins assigned to this category',
    type: [String],
  })
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined;

    const parseItem = (val: string): string | null => {
      const trimmed = val.trim();
      if (trimmed === 'string' || trimmed === '') return null;
      if (trimmed.endsWith('string') && trimmed.length > 6) {
        const cleaned = trimmed.substring(0, trimmed.length - 6);
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(cleaned)) {
          return cleaned;
        }
      }
      return trimmed;
    };

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed
            .map(parseItem)
            .filter((item): item is string => item !== null);
        }
      } catch (e) {
        if (value.includes(',')) {
          return value
            .split(',')
            .map(parseItem)
            .filter((item): item is string => item !== null);
        }
      }
      const single = parseItem(value);
      return single ? [single] : undefined;
    }

    if (Array.isArray(value)) {
      return value
        .map((v) => (typeof v === 'string' ? parseItem(v) : v))
        .filter((item): item is string => item !== null);
    }

    return [value];
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  adminIds?: string[];

  @ApiPropertyOptional({
    enum: CategoryStatusDto,
    default: CategoryStatusDto.ACTIVE,
  })
  @IsEnum(CategoryStatusDto)
  @IsOptional()
  status?: CategoryStatusDto;

  @ApiPropertyOptional({
    description: 'Keywords or tags associated with this category',
    example: ['ইলেকট্রনিক', 'কম্পিউটার', 'মোবাইল'],
    type: [String],
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return value.split(',').map((k: string) => k.trim()).filter(Boolean);
      }
    }
    return value;
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  keywords?: string[];
}
