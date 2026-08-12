import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateInquiryDto {
  @ApiProperty({
    description: 'Title of the inquiry',
    example: 'Looking for 500 bags of Premium Cement',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Detailed description of the inquiry',
    example: 'We need high quality premium concrete cement for building foundation.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Category ID of the inquiry',
    example: 'uuid-string-for-category',
  })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({
    description: 'Product image (uploaded file URL)',
    type: 'string',
    format: 'binary',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
