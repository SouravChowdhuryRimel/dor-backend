import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: 'The title of the category' })
  @IsString()
  @IsNotEmpty()
  title: string;
}
