import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/pagination/pagination.util';

export class QueryCategoryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search term matching category name',
    example: 'রাইস মিল',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}
