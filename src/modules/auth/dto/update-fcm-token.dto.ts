import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateFcmTokenDto {
  @ApiProperty({
    description: 'Firebase Cloud Messaging (FCM) token for push notifications',
    example: 'fcm_token_sample_1234567890_abcdef',
  })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;
}
