import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsArray,
} from 'class-validator';

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
    description: 'Unique email address of the company',
    example: 'company@example.com',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'District for the company location',
    example: 'Dhaka',
  })
  @IsString()
  @IsNotEmpty()
  district: string;

  @ApiProperty({
    description: 'Upozela for the company location',
    example: 'Mirpur',
  })
  @IsString()
  @IsNotEmpty()
  upozela: string;

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
    description: 'Array of document URLs for the company registration',
    example: ['url1.jpg', 'url2.jpg'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  companyDocument?: string[];
}
