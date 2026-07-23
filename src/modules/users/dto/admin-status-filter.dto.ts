import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum AdminStatusFilter {
  ALL = 'ALL',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class AdminStatusFilterDto {
  @ApiPropertyOptional({
    enum: AdminStatusFilter,
    default: AdminStatusFilter.ALL,
    description: 'Filter admins by account activity status',
  })
  @IsOptional()
  @Transform(({ value }) => String(value).toUpperCase())
  @IsEnum(AdminStatusFilter)
  status: AdminStatusFilter = AdminStatusFilter.ALL;
}
