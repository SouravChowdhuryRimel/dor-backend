import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateOrderDto } from './create-order.dto';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  @ApiPropertyOptional({
    description: 'Status of the order',
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
    description: 'ID of the associated company/vendor',
  })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({
    description: 'ID of the customer/party placing the order',
  })
  @IsString()
  @IsOptional()
  partyId?: string;

  @ApiPropertyOptional({
    description: 'Upazila/Upozela for delivery',
  })
  @IsString()
  @IsOptional()
  upozela?: string;

  @ApiPropertyOptional({
    description: 'District for delivery',
  })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({
    description: 'Discount amount for the order',
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  discount?: number;
}
