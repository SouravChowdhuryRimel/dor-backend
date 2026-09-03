import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateInquiryDto {
  @ApiPropertyOptional({
    description: 'Title of the inquiry (optional)',
    example: 'Looking for 500 bags of Premium Cement',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the inquiry (optional)',
    example:
      'We need high quality premium concrete cement for building foundation.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Category ID of the inquiry (optional)',
    example: 'uuid-string-for-category',
  })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Product image (uploaded file URL - optional)',
    type: 'string',
    format: 'binary',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
