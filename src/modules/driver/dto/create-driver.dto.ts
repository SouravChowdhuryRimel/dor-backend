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
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  driverDocument?: string[];

  @ApiPropertyOptional({ description: 'Latitude of driver location', example: 23.8103 })
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude of driver location', example: 90.4125 })
  @IsNumber()
  @IsOptional()
  long?: number;
}
