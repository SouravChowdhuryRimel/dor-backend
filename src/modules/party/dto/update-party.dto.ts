import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEmail,
  IsArray,
} from 'class-validator';

export class UpdatePartyDto {
  @ApiPropertyOptional({
    description: 'Documents of the party',
    type: [String],
    example: ['doc1.jpg', 'doc2.jpg'],
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
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  partyDocument?: string[];

  @ApiPropertyOptional({ description: 'Credit limit amount', example: 50000 })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsNumber()
  creditLimit?: number;

  @ApiPropertyOptional({
    description: 'Business Name of the party',
    example: 'Labib UR Rahman',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : (value as string),
  )
  businessName?: string;

  @ApiPropertyOptional({
    description: 'Area of the party (alias for bazzarArea)',
    example: 'Kakina Bazar',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : (value as string),
  )
  area?: string;

  @ApiPropertyOptional({
    description: 'District of the party',
    example: 'Lalmonirhat',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : (value as string),
  )
  district?: string;

  @ApiPropertyOptional({
    description: 'Bazzar of the party (alias for bazzarArea)',
    example: 'Kakina Bazar',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : (value as string),
  )
  bazzar?: string;

  @ApiPropertyOptional({
    description: 'Name of the party',
    example: 'Labib Telicome',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : (value as string),
  )
  partyName?: string;

  @ApiPropertyOptional({ description: 'Profile image file or URL string' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : (value as string),
  )
  profileImage?: string;

  @ApiPropertyOptional({ description: 'Status of the party (ACTIVE/INACTIVE)' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : (value as string),
  )
  status?: string;

  @ApiPropertyOptional({
    description: 'Upozela of the party',
    example: 'Kaligonj',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : (value as string),
  )
  upozela?: string;

  @ApiPropertyOptional({
    description: 'Latitude of party location',
    example: 23.8103,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude of party location',
    example: 90.4125,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Latitude (alias lat)',
    example: 23.8103,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({
    description: 'Longitude (alias long)',
    example: 90.4125,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsNumber()
  long?: number;

  @ApiPropertyOptional({
    description: 'Address of the party',
    example: 'Kaligonj, Lalmonirhat',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : (value as string),
  )
  address?: string;

  @ApiPropertyOptional({
    description: 'BazzarArea of the party',
    example: 'Kakina Bazar',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : (value as string),
  )
  bazzarArea?: string;

  @ApiPropertyOptional({
    description: 'Trade license number or reference',
    example: 'AFASEADADGDG',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : (value as string),
  )
  treadLicense?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '01400000000' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : (value as string),
  )
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Company ID this party belongs to' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : (value as string),
  )
  companyId?: string;

  @ApiPropertyOptional({ description: 'Category ID associated with the party' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : (value as string),
  )
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Opening due amount', example: 0 })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsNumber()
  openingDue?: number;

  @ApiPropertyOptional({
    description: 'Email address of the party',
    example: 'party@example.com',
  })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : (value as string),
  )
  email?: string;

  @ApiPropertyOptional({
    description: 'Description of the party',
    example: 'ABC Data',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : (value as string),
  )
  description?: string;
}
