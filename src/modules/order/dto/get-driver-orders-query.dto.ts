import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/pagination/pagination.util';

export enum DriverOrderStatusType {
  PENDING = 'pending',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
}

export class GetDriverOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter orders by status (pending, ongoing, completed)',
    enum: DriverOrderStatusType,
  })
  @IsOptional()
  @IsEnum(DriverOrderStatusType)
  type?: DriverOrderStatusType;
}
