import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class PartyLoginDto {
  @ApiProperty({ description: 'Phone number of party', example: '01712345678' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ description: 'Password', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class LoginDto {
  @ApiProperty({
    description: 'The registered email address of the user',
    example: 'superadmin@example.com',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'The password associated with the user account',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
