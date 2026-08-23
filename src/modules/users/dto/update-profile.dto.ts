import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  // Common / Admin / Super Admin fields
  @ApiPropertyOptional({ description: 'Name of the user/admin' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Password' })
  @IsString()
  @IsOptional()
  password?: string;

  // Company / Vendor fields
  @ApiPropertyOptional({ description: 'Company name' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ description: 'Owner name of the company' })
  @IsString()
  @IsOptional()
  ownerName?: string;

  @ApiPropertyOptional({ description: 'District' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ description: 'Upozela' })
  @IsString()
  @IsOptional()
  upozela?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Income Tax number' })
  @IsString()
  @IsOptional()
  incomeTax?: string;

  @ApiPropertyOptional({
    description: 'Company document paths/URLs',
    type: 'array',
    items: { type: 'string', format: 'binary' },
  })
  @IsOptional()
  companyDocument?: any;

  @ApiPropertyOptional({
    description: 'Company image/logo path/URL',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  companyImage?: any;

  // Party fields
  @ApiPropertyOptional({ description: 'Party Name' })
  @IsString()
  @IsOptional()
  partyName?: string;

  @ApiPropertyOptional({ description: 'Business Name of the party' })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiPropertyOptional({ description: 'Bazzar Area of the party' })
  @IsString()
  @IsOptional()
  bazzarArea?: string;

  @ApiPropertyOptional({ description: 'Bazzar (alias)' })
  @IsString()
  @IsOptional()
  bazzar?: string;

  @ApiPropertyOptional({ description: 'Area (alias)' })
  @IsString()
  @IsOptional()
  area?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Opening due amount' })
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  openingDue?: number;

  @ApiPropertyOptional({ description: 'Credit limit amount' })
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @IsOptional()
  creditLimit?: number;

  @ApiPropertyOptional({
    description: 'Trade license document path/URL',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  treadLicense?: any;

  @ApiPropertyOptional({
    description: 'Party document paths/URLs',
    type: 'array',
    items: { type: 'string', format: 'binary' },
  })
  @IsOptional()
  partyDocument?: any;

  @ApiPropertyOptional({
    description: 'Profile image path/URL',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  profileImage?: any;

  @ApiPropertyOptional({ description: 'Company ID this party belongs to' })
  @IsString()
  @IsOptional()
  companyId?: string;

  // Driver fields
  @ApiPropertyOptional({ description: 'Driver name' })
  @IsString()
  @IsOptional()
  driverName?: string;

  @ApiPropertyOptional({
    description: 'Driver image path/URL',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  driverImage?: any;

  @ApiPropertyOptional({ description: 'Truck number' })
  @IsString()
  @IsOptional()
  truckNumber?: string;

  @ApiPropertyOptional({ description: 'Track number (alias)' })
  @IsString()
  @IsOptional()
  trackNumber?: string;

  @ApiPropertyOptional({ description: 'Truck type' })
  @IsString()
  @IsOptional()
  truckType?: string;

  @ApiPropertyOptional({ description: 'Track type (alias)' })
  @IsString()
  @IsOptional()
  trackType?: string;

  @ApiPropertyOptional({ description: 'Load capacity' })
  @IsString()
  @IsOptional()
  loadCapacity?: string;

  @ApiPropertyOptional({ description: 'Driving license number' })
  @IsString()
  @IsOptional()
  drivingLicenceNumber?: string;

  @ApiPropertyOptional({ description: 'NID number' })
  @IsString()
  @IsOptional()
  nidNumber?: string;

  @ApiPropertyOptional({
    description: 'Driver document paths/URLs',
    type: 'array',
    items: { type: 'string', format: 'binary' },
  })
  @IsOptional()
  driverDocument?: any;

  @ApiPropertyOptional({
    description: 'Upozela/Upazela of the driver (alias: upazela)',
  })
  @IsString()
  @IsOptional()
  upazela?: string;
}
