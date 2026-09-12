import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/pagination/pagination.util';

export class QuerySubCategoryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter sub-categories by category ID',
    example: 'afac3d6e-ffdc-441b-935d-4f0b112d1bb0',
  })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Alias for categoryId',
  })
  @IsString()
  @IsOptional()
  category_id?: string;

  @ApiPropertyOptional({
    description: 'Search sub-categories by title',
    example: 'Cement',
  })
  @IsString()
  @IsOptional()
  search?: string;
}
