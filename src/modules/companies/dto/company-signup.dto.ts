import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CompanySignupDto {
  // Step 1: Primary Info
  @ApiProperty({
    description: 'Name of the company/business',
    example: 'Janata Rice Mill',
  })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({
    description: 'Full name of the company owner',
    example: 'Sourav Chowdhury',
  })
  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @ApiPropertyOptional({
    description: 'Category under which company operates',
    example: 'Rice Mill',
  })
  @IsString()
  @IsOptional()
  category?: string;

  // Step 1: Contact & Security Info
  @ApiProperty({
    description: 'Unique contact phone number of the company',
    example: '+8801711111111',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'Unique email address of the company',
    example: 'souravchowdhury6519@gmail.com',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Secure login password (minimum 6 characters)',
    example: 'SecurePass123!',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  // Step 2: Document copies URLs
  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Trade license document file',
  })
  @IsOptional()
  tradeLicenseCopy?: any;


  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Owner NID card front copy file',
  })
  @IsOptional()
  nidCopyFront?: any;


  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Owner NID card back copy file',
  })
  @IsOptional()
  nidCopyBack?: any;


  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Bank cheque book or statement copy file',
  })
  @IsOptional()
  bankStatementCopy?: any;

}
