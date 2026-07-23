import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber, IsEmail, IsArray } from 'class-validator';

export class CreatePartyDto {
  @ApiProperty({ description: 'Name of the party', example: 'John Party' })
  @IsString()
  @IsNotEmpty()
  partyName: string;

  @ApiProperty({ description: 'Business Name of the party', example: 'Acme Business' })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({ description: 'Phone number', example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ description: 'Email address of the party', example: 'party@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Password for logging in', minLength: 6, example: 'PartyPass123!' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'Address of the party', example: '789 Market St' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'District of the party', example: 'Dhaka' })
  @IsString()
  @IsNotEmpty()
  district: string;

  @ApiProperty({ description: 'Upozela of the party', example: 'Mirpur' })
  @IsString()
  @IsNotEmpty()
  upozela: string;

  @ApiPropertyOptional({ description: 'Bazzar/Area of the party', example: 'Mirpur Bazaar' })
  @IsString()
  @IsOptional()
  bazzarArea?: string;

  @ApiPropertyOptional({ description: 'Bazzar of the party (alias for bazzarArea)', example: 'Mirpur Bazaar' })
  @IsString()
  @IsOptional()
  bazzar?: string;

  @ApiPropertyOptional({ description: 'Area of the party (alias for bazzarArea)', example: 'Mirpur Bazaar' })
  @IsString()
  @IsOptional()
  area?: string;

  @ApiProperty({ description: 'Description of the party', example: 'Retailer merchant' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Company ID this party belongs to' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiPropertyOptional({
    description: 'Trade license number or reference',
    example: 'TL-1234567890',
  })
  @IsString()
  @IsOptional()
  treadLicense?: string;


  @ApiPropertyOptional({
    description: 'Documents of the party',
    type: [String],
    example: ['doc1.jpg', 'doc2.jpg'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  partyDocument?: string[];

  @ApiPropertyOptional({ description: 'Profile image URL/path of the party' })
  @IsString()
  @IsOptional()
  profileImage?: string;
}
