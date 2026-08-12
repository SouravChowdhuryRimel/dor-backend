import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ComplaintStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../shared/pagination/pagination.util';

export class GetComplaintsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by complaint status', enum: ComplaintStatus })
  @IsEnum(ComplaintStatus)
  @IsOptional()
  status?: ComplaintStatus;

  @ApiPropertyOptional({ description: 'Filter by party ID' })
  @IsString()
  @IsOptional()
  partyId?: string;

  @ApiPropertyOptional({ description: 'Filter by company ID' })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Filter by driver ID' })
  @IsString()
  @IsOptional()
  driverId?: string;

  @ApiPropertyOptional({ description: 'Filter by product ID' })
  @IsString()
  @IsOptional()
  productId?: string;
}
