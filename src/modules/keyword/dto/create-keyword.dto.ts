import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateKeywordDto {
  @ApiPropertyOptional({
    description: 'Name of the keyword to create',
    example: 'ইলেকট্রনিক্স',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({
    description: 'Array of keyword names for bulk creation',
    example: ['চাল', 'খাদ্যপণ্য', 'কৃষিপণ্য'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  names?: string[];
}
