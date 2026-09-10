import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsArray,
  IsNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCompanyDto {
  @ApiProperty({
    description: 'Phone number of the company owner',
    example: '1234567890',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: 'Secure password for the company login (minimum 6 characters)',
    example: 'CompanyPass123!',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Name of the company owner',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @ApiProperty({
    description: 'Name of the company',
    example: 'Acme Corp',
  })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({
    description: 'Unique email address of the company',
    example: 'company@example.com',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Latitude for the company location',
    example: 23.8103,
  })
  @Transform(({ value }) =>
    value !== undefined && value !== null && value !== ''
      ? parseFloat(value)
      : undefined,
  )
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({
    description: 'Longitude for the company location',
    example: 90.4125,
  })
  @Transform(({ value }) =>
    value !== undefined && value !== null && value !== ''
      ? parseFloat(value)
      : undefined,
  )
  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @ApiProperty({
    description: 'Detailed address for the company',
    example: '123 Business St',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: 'Category ID associated with the company',
    example: 'uuid-string',
  })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({
    description: 'Income tax identification number or reference',
    example: 'TIN-1234567890',
  })
  @IsString()
  @IsOptional()
  incomeTax?: string;

  @ApiPropertyOptional({
    description: 'Array of document URLs for the company registration',
    example: ['url1.jpg', 'url2.jpg'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  companyDocument?: string[];

  @ApiPropertyOptional({
    description: 'URL of the company image / logo',
    example: '/uploads/documents/company-image-123456.jpg',
  })
  @IsString()
  @IsOptional()
  companyImage?: string;

  @ApiPropertyOptional({
    description: 'Keywords or service tags associated with the company business',
    example: ['ইলেকট্রনিক', 'কম্পিউটার', 'মোবাইল'],
    type: [String],
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return value.split(',').map((k: string) => k.trim()).filter(Boolean);
      }
    }
    return value;
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  keywords?: string[];
}
