import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/pagination/pagination.util';

export class QueryKeywordDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search term matching keyword names (case-insensitive)',
    example: 'চাল',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Set to "true" to fetch all keywords without pagination',
    example: 'false',
  })
  @IsOptional()
  @IsBooleanString()
  all?: string;

  @ApiPropertyOptional({
    description:
      'Field to sort by: popularity (default - by company profile usage count), name, or createdAt',
    example: 'popularity',
    enum: ['popularity', 'name', 'createdAt'],
  })
  @IsOptional()
  @IsString()
  sortBy?: 'popularity' | 'name' | 'createdAt' | string;

  @ApiPropertyOptional({
    description:
      'Sort direction: desc (default for popularity/createdAt) or asc',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
