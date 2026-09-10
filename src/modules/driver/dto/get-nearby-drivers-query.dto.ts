import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/pagination/pagination.util';

export class GetNearbyDriversQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Latitude for nearby calculation (e.g. 23.8103)',
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({
    description: 'Longitude for nearby calculation (e.g. 90.4125)',
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  long?: number;

  @ApiPropertyOptional({
    description: 'Search radius in kilometers (default: 50km)',
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radius?: number;

  @ApiPropertyOptional({ description: 'Filter by district name' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: 'Filter by upozela name' })
  @IsOptional()
  @IsString()
  upozela?: string;

  @ApiPropertyOptional({ description: 'Filter by truck type' })
  @IsOptional()
  @IsString()
  truckType?: string;

  @ApiPropertyOptional({ description: 'Search term for name or phone' })
  @IsOptional()
  @IsString()
  search?: string;
}
