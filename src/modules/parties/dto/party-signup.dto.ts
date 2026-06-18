import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class PartySignupDto {
  // Step 1: Primary Info
  @ApiProperty({
    description: 'Name of the business/shop',
    example: 'Sonali Traders',
  })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({
    description: 'Full name of the business owner or contact person',
    example: 'Sourav Chowdhury',
  })
  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @ApiPropertyOptional({
    description: 'Type of business operation',
    example: 'Dealer',
  })
  @IsString()
  @IsOptional()
  businessType?: string;

  // Step 1: Contact & Security Info
  @ApiProperty({
    description: 'Unique contact phone number of the business',
    example: '+8801711111111',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'Unique email address of the business',
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

  // Step 2: Address & Location Info
  @ApiPropertyOptional({
    description: 'District name',
    example: 'Dhaka',
  })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({
    description: 'Upazila name',
    example: 'Mirpur',
  })
  @IsString()
  @IsOptional()
  upazila?: string;

  @ApiPropertyOptional({
    description: 'Detailed street road address, landmark, area',
    example: 'Road 5, Block C, Mirpur 1',
  })
  @IsString()
  @IsOptional()
  detailedAddress?: string;

  @ApiPropertyOptional({
    description: 'Market or Area name',
    example: 'Mirpur Bazaar',
  })
  @IsString()
  @IsOptional()
  marketArea?: string;

  // Step 2: Document copies & notes URLs
  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'NID or Business Document file',
  })
  @IsOptional()
  businessDocument?: any;


  @ApiPropertyOptional({
    description: 'Additional notes or info',
    example: 'Preferred delivery in the morning hours.',
  })
  @IsString()
  @IsOptional()
  additionalNote?: string;
}
