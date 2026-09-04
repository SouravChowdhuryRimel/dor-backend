import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInquiryResponseDto {
  @ApiPropertyOptional({
    description: 'Comment or offer message from the company',
    example: 'We can deliver 500 bags of Premium Cement by tomorrow morning.',
  })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({
    description: 'Offered price per unit or total price offer',
    example: 520,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  offeredPrice?: number;

  @ApiPropertyOptional({
    description: 'Optional Product ID to allow Party to directly order the product',
    example: 'uuid-string-of-product',
  })
  @IsString()
  @IsOptional()
  productId?: string;
}
