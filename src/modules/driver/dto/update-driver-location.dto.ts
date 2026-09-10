import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateDriverLocationDto {
  @ApiProperty({ description: 'Latitude coordinate', example: 23.8103 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @ApiProperty({ description: 'Longitude coordinate', example: 90.4125 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  long: number;

  @ApiPropertyOptional({
    description: 'Current location name / address text',
    example: 'Mirpur 10, Dhaka',
  })
  @IsOptional()
  @IsString()
  address?: string;
}
