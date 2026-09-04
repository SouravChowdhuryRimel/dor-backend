import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

export class CreateInquiryDto {
  @ApiProperty({
    description: 'Title of the inquiry',
    example: 'Looking for 500 bags of Premium Cement',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Name of the product requested',
    example: 'Supercrete Portland Composite Cement',
  })
  @IsString()
  @IsOptional()
  productName?: string;

  @ApiProperty({
    description: 'Detailed description of the inquiry',
    example:
      'We need high quality premium concrete cement for building foundation.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Quantity required (e.g. 500 Bags / 10 Ton)',
    example: '500 Bags',
  })
  @IsString()
  @IsOptional()
  quantity?: string;

  @ApiPropertyOptional({
    description: 'Deadline by when the product is required (ISO Date String)',
    example: '2026-09-15',
  })
  @IsString()
  @IsOptional()
  deadline?: string;

  @ApiPropertyOptional({
    description: 'Category ID of the inquiry (Optional: Auto-retrieved from logged-in Party profile if omitted)',
    example: 'uuid-string-for-category',
  })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Product images (uploaded file URLs)',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  imageUrls?: string[];
}
