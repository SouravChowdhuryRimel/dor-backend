import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/pagination/pagination.util';

export class GetOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by company ID' })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Filter by party ID' })
  @IsString()
  @IsOptional()
  partyId?: string;

  @ApiPropertyOptional({
    description: 'Filter by order status',
    enum: [
      'PENDING',
      'ACCEPTED',
      'PROCESSING',
      'DISPATCHED',
      'DELIVERED',
      'CANCELLED',
    ],
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'Search query for friendly order ID (showOrderId)',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort by field (createdAt, totalRate, bag, status)',
    example: 'createdAt',
  })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order (asc, desc)',
    example: 'desc',
  })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
