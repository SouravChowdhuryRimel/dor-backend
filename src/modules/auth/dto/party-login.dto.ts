import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class PartyLoginDto {
  @ApiProperty({
    description: 'The registered phone number of the party',
    example: '01712345678',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: 'The password associated with the party account',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    description: 'Optional Firebase Cloud Messaging (FCM) token for push notifications',
    example: 'fcm_token_sample_123456',
  })
  @IsString()
  @IsOptional()
  fcmToken?: string;
}
