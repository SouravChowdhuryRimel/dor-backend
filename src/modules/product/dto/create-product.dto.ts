import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsOptional,
  Min,
  IsEnum,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PackagingType, UnitType } from '@prisma/client';

export class CreateProductDto {
  @ApiPropertyOptional({
    description: 'Array of product image URLs',
    example: ['url1.jpg', 'url2.jpg'],
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

  @ApiProperty({
    description: 'Name of the product',
    example: 'Premium Cement',
  })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'Bags',
  })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({
    description: 'Size of the bag',
    example: '50kg',
  })
  @IsString()
  @IsNotEmpty()
  bagSize: string;

  @ApiProperty({
    description: 'Type of packaging',
    enum: PackagingType,
    example: PackagingType.BAG,
  })
  @IsEnum(PackagingType)
  @IsNotEmpty()
  packagingType: PackagingType;

  @ApiProperty({
    description: 'Type of unit',
    enum: UnitType,
    example: UnitType.PIECE,
  })
  @IsEnum(UnitType)
  @IsNotEmpty()
  unitType: UnitType;

  @ApiPropertyOptional({
    description:
      'Default price of the product (Legacy, falls back to offerPrice)',
    example: 450.5,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  defaultPrice?: number;

  @ApiProperty({
    description: 'Regular price of the product',
    example: 500.0,
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  @Type(() => Number)
  regularPrice: number;

  @ApiProperty({
    description: 'Offer price of the product (discounted)',
    example: 450.0,
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  @Type(() => Number)
  offerPrice: number;

  @ApiProperty({
    description: 'Minimum order quantity',
    example: 50,
  })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  minimumOrder: number;

  @ApiProperty({
    description: 'Description of the product',
    example: 'High strength cement for structural use.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Available stock size',
    example: 1000,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stockSize: number;

  @ApiPropertyOptional({
    description: 'ID of the SubCategory',
    example: 'uuid-string',
  })
  @IsString()
  @IsOptional()
  subCategoryId?: string;

  @ApiPropertyOptional({
    description:
      'ID of the Category (required if subCategoryId is not provided)',
    example: 'uuid-string',
  })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'ID of the associated company/vendor',
    example: 'company-uuid-string',
  })
  @IsString()
  @IsOptional()
  companyId?: string;
}
