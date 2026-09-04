import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  IsNumber,
} from 'class-validator';

export class UpdateDriverDto {
  @ApiPropertyOptional({
    description: 'Email address of the driver',
    example: 'driver@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Driver image file or string URL' })
  @IsString()
  @IsOptional()
  driverImage?: string;

  @ApiPropertyOptional({ description: 'Name of the driver', example: 'Labib Driver' })
  @IsString()
  @IsOptional()
  driverName?: string;

  @ApiPropertyOptional({ description: 'Address of the driver', example: '456 Road St' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'District of the driver', example: 'Dhaka' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ description: 'Load Capacity', example: '10 Ton' })
  @IsString()
  @IsOptional()
  loadCapacity?: string;

  @ApiPropertyOptional({
    description: 'Driving Licence Number',
    example: 'DL-987654321',
  })
  @IsString()
  @IsOptional()
  drivingLicenceNumber?: string;

  @ApiPropertyOptional({ description: 'NID Number', example: 'NID-123456789' })
  @IsString()
  @IsOptional()
  nidNumber?: string;

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

  @ApiPropertyOptional({ description: 'Truck Type', example: '10 Ton Lorry' })
  @IsString()
  @IsOptional()
  truckType?: string;
}

