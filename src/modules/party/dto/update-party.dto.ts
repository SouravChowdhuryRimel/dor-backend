import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEmail,
  IsArray,
  Min,
} from 'class-validator';

export class UpdatePartyDto {
  @ApiPropertyOptional({ description: 'Name of the party', example: 'John Party' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  partyName?: string;

  @ApiPropertyOptional({
    description: 'Business Name of the party',
    example: 'Acme Business',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  businessName?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '1234567890' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Email address of the party',
    example: 'party@example.com',
  })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  email?: string;

  @ApiPropertyOptional({
    description: 'Password for logging in',
    minLength: 6,
    example: 'PartyPass123!',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  password?: string;

  @ApiPropertyOptional({
    description: 'Address of the party',
    example: '789 Market St',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  address?: string;

  @ApiPropertyOptional({ description: 'District of the party', example: 'Dhaka' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  district?: string;

  @ApiPropertyOptional({ description: 'Upozela of the party', example: 'Mirpur' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  upozela?: string;

  @ApiPropertyOptional({
    description: 'Bazzar/Area of the party',
    example: 'Mirpur Bazaar',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  bazzarArea?: string;

  @ApiPropertyOptional({
    description: 'Bazzar of the party (alias for bazzarArea)',
    example: 'Mirpur Bazaar',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  bazzar?: string;

  @ApiPropertyOptional({
    description: 'Area of the party (alias for bazzarArea)',
    example: 'Mirpur Bazaar',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  area?: string;

  @ApiPropertyOptional({
    description: 'Description of the party',
    example: 'Retailer merchant',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  description?: string;

  @ApiPropertyOptional({
    description: 'Category ID associated with the party',
    example: 'uuid-string',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Trade license number or reference',
    example: 'TL-1234567890',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  treadLicense?: string;

  @ApiPropertyOptional({
    description: 'Documents of the party',
    type: [String],
    example: ['doc1.jpg', 'doc2.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  partyDocument?: string[];

  @ApiPropertyOptional({ description: 'Profile image URL/path of the party' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  profileImage?: string;

  @ApiPropertyOptional({ description: 'Status of the party (ACTIVE/INACTIVE)' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  status?: string;

  @ApiPropertyOptional({ description: 'Opening due amount', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  openingDue?: number;

  @ApiPropertyOptional({ description: 'Credit limit amount', example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  creditLimit?: number;

  @ApiPropertyOptional({ description: 'Company ID this party belongs to' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  companyId?: string;
}
