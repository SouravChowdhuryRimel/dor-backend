import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateInquiryDto {
  @ApiPropertyOptional({
    description: 'Title of the inquiry (optional)',
    example: 'Looking for 500 bags of Premium Cement',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Name of the product requested',
    example: 'Supercrete Portland Composite Cement',
  })
  @IsString()
  @IsOptional()
  productName?: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the inquiry (optional)',
    example:
      'We need high quality premium concrete cement for building foundation.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Quantity required (e.g. 500 Bags / 10 Ton)',
    example: '500 Bags',
  })
  @IsString()
  @IsOptional()
  quantity?: string;

  @ApiPropertyOptional({
    description: 'Deadline by when product is required',
    example: '2026-09-15',
  })
  @IsString()
  @IsOptional()
  deadline?: string;

  @ApiPropertyOptional({
    description: 'Category ID of the inquiry (optional)',
    example: 'uuid-string-for-category',
  })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Product images (uploaded file URLs - optional)',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  imageUrls?: string[];

  @ApiPropertyOptional({
    description: 'Keywords/tags for the inquiry (optional)',
    example: ['ইলেকট্রনিক', 'কম্পিউটার'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  keywords?: string[];
}
