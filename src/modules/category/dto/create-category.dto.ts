import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum CategoryStatusDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class CreateCategoryDto {
  @ApiProperty({ description: 'The name of the category' })
  @IsString()
  @IsNotEmpty()
  categoryName: string;

  @ApiPropertyOptional({ description: 'Category thumbnail URL or path' })
  @IsString()
  @IsOptional()
  categoryThumbnail?: string;

  @ApiPropertyOptional({ description: 'IDs of admins assigned to this category', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  adminIds?: string[];

  @ApiPropertyOptional({ enum: CategoryStatusDto, default: CategoryStatusDto.ACTIVE })
  @IsEnum(CategoryStatusDto)
  @IsOptional()
  status?: CategoryStatusDto;
}
