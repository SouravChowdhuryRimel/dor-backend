import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateDriverDto } from './create-driver.dto';
import { IsString, IsOptional } from 'class-validator';

export class UpdateDriverDto extends PartialType(CreateDriverDto) {
  @ApiPropertyOptional({ description: 'Upozela of the driver', example: 'Mirpur' })
  @IsString()
  @IsOptional()
  upozela?: string;

  @ApiPropertyOptional({ description: 'Upazela of the driver (alias: upazela)', example: 'Mirpur' })
  @IsString()
  @IsOptional()
  upazela?: string;

  @ApiPropertyOptional({ description: 'Truck Number', example: 'DHA-1234' })
  @IsString()
  @IsOptional()
  truckNumber?: string;

  @ApiPropertyOptional({ description: 'Track Number (alias for truckNumber)', example: 'DHA-1234' })
  @IsString()
  @IsOptional()
  trackNumber?: string;

  @ApiPropertyOptional({ description: 'Truck Type', example: '10 Ton Lorry' })
  @IsString()
  @IsOptional()
  truckType?: string;

  @ApiPropertyOptional({ description: 'Track Type (alias for truckType)', example: '10 Ton Lorry' })
  @IsString()
  @IsOptional()
  trackType?: string;
}
