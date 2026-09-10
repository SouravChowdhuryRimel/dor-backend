import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  MinLength,
  IsNumber,
} from 'class-validator';

export class CreateDriverDto {
  @ApiProperty({
    description: 'Phone number of the driver',
    example: '1234567890',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: 'Email address of the driver',
    example: 'driver@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Secure password for driver login',
    example: 'DriverPass123!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: 'Driver image URL/path' })
  @IsString()
  @IsOptional()
  driverImage?: string;

  @ApiProperty({ description: 'Name of the driver', example: 'John Driver' })
  @IsString()
  @IsNotEmpty()
  driverName: string;

  @ApiProperty({ description: 'Address of the driver', example: '456 Road St' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'District of the driver', example: 'Dhaka' })
  @IsString()
  @IsNotEmpty()
  district: string;

  @ApiPropertyOptional({ description: 'Upozela of the driver', example: 'Mirpur' })
  @IsString()
  @IsOptional()
  upozela?: string;

  @ApiPropertyOptional({
    description: 'Upazela of the driver (alias for upozela)',
    example: 'Mirpur',
  })
  @IsString()
  @IsOptional()
  upazela?: string;

  @ApiPropertyOptional({ description: 'Truck Number', example: 'DHA-1234' })
  @IsString()
  @IsOptional()
  truckNumber?: string;

  @ApiPropertyOptional({
    description: 'Track Number (alias for truckNumber)',
    example: 'DHA-1234',
  })
  @IsString()
  @IsOptional()
  trackNumber?: string;

  @ApiPropertyOptional({ description: 'Truck Type', example: '10 Ton Lorry' })
  @IsString()
  @IsOptional()
  truckType?: string;

  @ApiPropertyOptional({
    description: 'Track Type (alias for truckType)',
    example: '10 Ton Lorry',
  })
  @IsString()
  @IsOptional()
  trackType?: string;

  @ApiPropertyOptional({ description: 'Load Capacity', example: '10 Ton' })
  @IsString()
  @IsOptional()
  loadCapacity?: string;

  @ApiPropertyOptional({
    description: 'Company IDs hiring this driver',
    type: [String],
  })
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined;
    if (typeof value === 'string') {
      if (value.trim().startsWith('[')) {
        try {
          return JSON.parse(value);
        } catch {
          return [value];
        }
      }
      return [value];
    }
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  companyIds?: string[];

  @ApiPropertyOptional({
    description: 'Party IDs hiring this driver',
    type: [String],
  })
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined;
    if (typeof value === 'string') {
      if (value.trim().startsWith('[')) {
        try {
          return JSON.parse(value);
        } catch {
          return [value];
        }
      }
      return [value];
    }
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  partyIds?: string[];

  @ApiProperty({
    description: 'Driving Licence Number',
    example: 'DL-987654321',
  })
  @IsString()
  @IsNotEmpty()
  drivingLicenceNumber: string;

  @ApiProperty({ description: 'NID Number', example: 'NID-123456789' })
  @IsString()
  @IsNotEmpty()
  nidNumber: string;

  @ApiPropertyOptional({
    description: 'Documents of the driver',
    type: [String],
    example: ['url1.jpg', 'url2.jpg'],
  })
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined;
    if (typeof value === 'string') {
      if (value.trim().startsWith('[')) {
        try {
          return JSON.parse(value);
        } catch {
          return [value];
        }
      }
      return [value];
    }
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  driverDocument?: string[];

  @ApiPropertyOptional({ description: 'Latitude of driver location', example: 23.8103 })
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined;
    return typeof value === 'string' ? parseFloat(value) : value;
  })
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude of driver location', example: 90.4125 })
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined;
    return typeof value === 'string' ? parseFloat(value) : value;
  })
  @IsNumber()
  @IsOptional()
  long?: number;
}
