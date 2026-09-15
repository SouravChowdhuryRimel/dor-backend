import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TogglePushNotificationDto {
  @ApiProperty({
    description:
      'Enable (true) or disable (false) FCM push notifications for this device/account',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  enabled: boolean;

  @ApiPropertyOptional({
    description:
      'Optional FCM device token to register or refresh when enabling push notifications',
    example: 'fcm_token_sample_1234567890_abcdef',
  })
  @IsOptional()
  @IsString()
  fcmToken?: string;
}
