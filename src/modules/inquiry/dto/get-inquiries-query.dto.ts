import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/pagination/pagination.util';

export class GetInquiriesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by party ID' })
  @IsString()
  @IsOptional()
  partyId?: string;
}
