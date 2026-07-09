import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  MinLength,
} from 'class-validator';

export class CreateDriverDto {
  @ApiProperty({ description: 'Phone number of the driver' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ description: 'Email address of the driver' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Secure password for driver login' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    description: 'Documents of the driver',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  driverDocument?: string[];
}
