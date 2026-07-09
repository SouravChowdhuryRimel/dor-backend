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
}
