import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOfferDto {
  @ApiProperty({
    description: 'Promotional offer price of the product',
    example: 400.0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offerPrice: number;

  @ApiProperty({
    description: 'Percentage discount rate',
    example: 10.5,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountRate: number;

  @ApiProperty({
    description: 'Offer start date (ISO string)',
    example: '2026-08-03T00:00:00.000Z',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Offer end date (ISO string)',
    example: '2026-08-10T00:00:00.000Z',
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Status of the offer',
    example: 'ACTIVE',
    default: 'ACTIVE',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({
    description: 'Description of the offer terms',
    example: 'Special discount on wholesale purchases.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'ID of the client/party receiving this offer',
    example: 'party-uuid-string',
  })
  @IsString()
  @IsNotEmpty()
  partyId: string;

  @ApiProperty({
    description: 'ID of the product associated with this offer',
    example: 'product-uuid-string',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;
}
