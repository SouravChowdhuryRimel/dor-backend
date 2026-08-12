import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { DeliveryStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../shared/pagination/pagination.util';

export class GetDeliveriesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by driver ID' })
  @IsString()
  @IsOptional()
  driverId?: string;

  @ApiPropertyOptional({ description: 'Filter by delivery status', enum: DeliveryStatus })
  @IsEnum(DeliveryStatus)
  @IsOptional()
  status?: DeliveryStatus;
}
