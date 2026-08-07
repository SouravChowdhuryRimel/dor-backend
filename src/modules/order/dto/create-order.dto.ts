import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @ApiPropertyOptional({
    description: 'Unique friendly order ID. If not provided, it will be auto-generated.',
    example: 'ORD-88422',
  })
  @IsString()
  @IsOptional()
  showOrderId?: string;

  @ApiProperty({
    description: 'ID of the associated company/vendor',
    example: 'company-uuid-string',
  })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({
    description: 'ID of the product being ordered',
    example: 'product-uuid-string',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'Number of bags ordered',
    example: 100,
  })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  bag: number;

  @ApiProperty({
    description: 'Size of each bag',
    example: '50kg',
  })
  @IsString()
  @IsNotEmpty()
  bagSize: string;

  @ApiProperty({
    description: 'Total rate/price for the order',
    example: 45000,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalRate: number;

  @ApiPropertyOptional({
    description: 'ID of the customer/party placing the order',
    example: 'party-uuid-string',
  })
  @IsString()
  @IsOptional()
  partyId?: string;
}
