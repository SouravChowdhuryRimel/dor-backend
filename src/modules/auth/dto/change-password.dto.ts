import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password of the user',
    example: '123456',
  })
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description: 'New password for the user (minimum 6 characters)',
    example: 'NewPass123!',
    minLength: 6,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  newPassword: string;
}
