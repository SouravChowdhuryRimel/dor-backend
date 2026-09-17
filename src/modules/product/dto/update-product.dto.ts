import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsArray,
  IsEnum,
} from 'class-validator';
import { PackagingType, UnitType } from '@prisma/client';

export class UpdateProductDto {
  @ApiPropertyOptional({
    description: 'Array of product image URLs',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === 'string') {
      return [value];
    }
    return value as string[];
  })
  @IsArray()
  @IsString({ each: true })
  productImage?: string[];

  @ApiPropertyOptional({ description: 'Name of the product' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  productName?: string;

  @ApiPropertyOptional({ description: 'Unit of measurement' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  unit?: string;

  @ApiPropertyOptional({ description: 'Size of the bag' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  bagSize?: string;

  @ApiPropertyOptional({
    description: 'Type of packaging',
    enum: PackagingType,
  })
  @IsOptional()
  @IsEnum(PackagingType)
  packagingType?: PackagingType;

  @ApiPropertyOptional({
    description: 'Type of unit',
    enum: UnitType,
  })
  @IsOptional()
  @IsEnum(UnitType)
  unitType?: UnitType;

  @ApiPropertyOptional({ description: 'Default price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  defaultPrice?: number;

  @ApiPropertyOptional({ description: 'Regular price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  regularPrice?: number;

  @ApiPropertyOptional({ description: 'Offer price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  offerPrice?: number;

  @ApiPropertyOptional({ description: 'Minimum order quantity' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  minimumOrder?: number;

  @ApiPropertyOptional({ description: 'Description of the product' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  description?: string;

  @ApiPropertyOptional({ description: 'Available stock size' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  stockSize?: number;

  @ApiPropertyOptional({ description: 'ID of the SubCategory' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  subCategoryId?: string;

  @ApiPropertyOptional({ description: 'ID of the Category' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  categoryId?: string;

  @ApiPropertyOptional({ description: 'ID of the associated company/vendor' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  companyId?: string;
}
