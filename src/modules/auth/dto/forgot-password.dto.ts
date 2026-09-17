import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'admin@example.com',
    description: 'Registered email address of the account',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
