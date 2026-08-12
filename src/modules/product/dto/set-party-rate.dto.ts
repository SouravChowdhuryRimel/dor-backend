import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SetPartyProductRateDto {
  @ApiProperty({
    description: 'ID of the associated party',
    example: 'party-uuid-string',
  })
  @IsString()
  @IsNotEmpty()
  partyId: string;

  @ApiProperty({
    description: 'ID of the associated product',
    example: 'product-uuid-string',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'Custom product rate for this party',
    example: 420.0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  rate: number;
}
