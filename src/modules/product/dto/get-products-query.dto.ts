import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../shared/pagination/pagination.util';

export class GetProductsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search term for product name (fuzzy)' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by subcategory ID' })
  @IsString()
  @IsOptional()
  subCategoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by company ID' })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Filter by minimum default price' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Filter by maximum default price' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Field to sort by (defaultPrice, productName, createdAt, stockSize)',
    example: 'defaultPrice',
  })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order (asc, desc)',
    example: 'asc',
  })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
