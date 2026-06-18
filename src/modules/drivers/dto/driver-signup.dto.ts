import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class DriverSignupDto {
  // Step 1: Personal Info
  @ApiProperty({
    description: 'Full name of the driver',
    example: 'Sourav Chowdhury',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Unique phone number of the driver used for authentication',
    example: '+8801711111111',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'Unique email address of the driver',
    example: 'souravchowdhury6519@gmail.com',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Secure password (minimum 6 characters)',
    example: 'SecurePass123!',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Driver profile picture file',
  })
  @IsOptional()
  avatar?: any;


  @ApiPropertyOptional({
    description: 'Present address of the driver',
    example: 'House 12, Road 5, Banani, Dhaka',
  })
  @IsString()
  @IsOptional()
  presentAddress?: string;

  @ApiPropertyOptional({
    description: 'District name',
    example: 'Dhaka',
  })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({
    description: 'Upazila name',
    example: 'Banani',
  })
  @IsString()
  @IsOptional()
  upazila?: string;

  // Step 2: Vehicle Info
  @ApiProperty({
    description: 'Truck registration plate number',
    example: 'Dhaka Metro-T 12-3456',
  })
  @IsString()
  @IsNotEmpty()
  truckNumber: string;

  @ApiProperty({
    description: 'Type of truck/vehicle',
    example: '10 Ton',
  })
  @IsString()
  @IsNotEmpty()
  truckType: string;

  @ApiProperty({
    description: 'Weight load capacity (in Kg/Tons)',
    example: '10,000 kg',
  })
  @IsString()
  @IsNotEmpty()
  loadCapacity: string;

  // Step 2: ID & License Info
  @ApiProperty({
    description: 'Driving license document number',
    example: 'DL-8837199',
  })
  @IsString()
  @IsNotEmpty()
  drivingLicenseNumber: string;

  @ApiProperty({
    description: 'NID card number',
    example: '9187364811',
  })
  @IsString()
  @IsNotEmpty()
  nidNumber: string;

  // Step 3: Document copies URLs
  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'NID card front copy file',
  })
  @IsOptional()
  nidCopyFront?: any;


  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'NID card back copy file',
  })
  @IsOptional()
  nidCopyBack?: any;


  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Driving license card photo copy file',
  })
  @IsOptional()
  drivingLicenseCopy?: any;


  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Truck picture copy file',
  })
  @IsOptional()
  truckPhoto?: any;

}
