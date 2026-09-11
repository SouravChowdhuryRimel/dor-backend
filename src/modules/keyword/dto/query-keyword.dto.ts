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
}
