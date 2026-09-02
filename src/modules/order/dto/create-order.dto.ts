import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateOrderDto {
  @ApiProperty({
    description: 'ID of the product being ordered',
    example: '0463454b-2844-4514-8124-ed07edbb50af',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({
    description: 'Packaging type for the order',
    example: 'BAG',
  })
  @IsString()
  @IsOptional()
  packagingType?: string;

  @ApiProperty({
    description: 'Quantity ordered',
    example: 50,
  })
  @Transform(({ value }) =>
    value !== undefined && value !== null && value !== ''
      ? typeof value === 'string'
        ? parseFloat(value)
        : value
      : undefined,
  )
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({
    description: 'Total rate/price for the order',
    example: 45000,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsNotEmpty()
  totalRate: number;

  @ApiPropertyOptional({
    description: 'Full delivery address (drop location)',
    example: 'Road 5, Holding 24, Savar',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Additional delivery address details',
    example: 'Flat 4B, Building 2',
  })
  @IsString()
  @IsOptional()
  additionalAddress?: string;

  @ApiPropertyOptional({
    description: 'Drop latitude (Float number or numeric string)',
    example: 10.00,
  })
  @Transform(({ value }) =>
    value !== undefined && value !== null && value !== ''
      ? typeof value === 'string'
        ? parseFloat(value)
        : value
      : undefined,
  )
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({
    description: 'Drop longitude (Float number or numeric string)',
    example: 100.0,
  })
  @Transform(({ value }) =>
    value !== undefined && value !== null && value !== ''
      ? typeof value === 'string'
        ? parseFloat(value)
        : value
      : undefined,
  )
  @IsNumber()
  @IsOptional()
  long?: number;

  @ApiPropertyOptional({
    description: 'Scheduled delivery date/time (ISO string)',
    example: '2026-08-15T12:00:00.000Z',
  })
  @IsString()
  @IsOptional()
  deliveryTime?: string;

  @ApiPropertyOptional({
    description: 'Special note for delivery',
    example: 'Deliver urgently',
  })
  @IsString()
  @IsOptional()
  specialNote?: string;
}
