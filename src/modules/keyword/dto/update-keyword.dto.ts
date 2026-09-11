import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdateKeywordDto {
  @ApiProperty({
    description: 'Updated name of the keyword',
    example: 'কম্পিউটার ও ল্যাপটপ',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;
}
