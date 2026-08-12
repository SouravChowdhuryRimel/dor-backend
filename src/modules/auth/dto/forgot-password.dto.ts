import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    enum: Role,
    description: 'Optional account role when one email is used by multiple accounts',
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
