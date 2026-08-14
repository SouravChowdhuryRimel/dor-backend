import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateSubCategoryDto {
  @ApiProperty({
    description: 'The title of the SubCategory',
    example: 'Structural Design',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'The category ID that the sub-category belongs to',
    example: 'category-uuid',
  })
  @IsString()
  @IsNotEmpty()
  categoryId: string;
}
