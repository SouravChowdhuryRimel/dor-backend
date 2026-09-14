import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiPropertyOptional({
    description: 'The body of the text message',
    example: 'Hello! I would like to inquire about the delivery status.',
  })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional({
    description: 'The file attachment path or URL',
    example: '/uploads/chat/chat-file-123456789.pdf',
  })
  @IsString()
  @IsOptional()
  file?: string;

  @ApiPropertyOptional({
    description: 'The image attachment path or URL',
    example: '/uploads/chat/chat-img-123456789.png',
  })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({
    description: 'Latitude coordinate for location sharing',
    example: 23.8103,
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate for location sharing',
    example: 90.4125,
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Location name or formatted address (optional)',
    example: 'Mirpur 10, Dhaka',
  })
  @IsString()
  @IsOptional()
  locationName?: string;

  @ApiPropertyOptional({
    description: 'Set to true for live location sharing (Messenger style)',
    example: false,
  })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  isLiveLocation?: boolean;

  @ApiPropertyOptional({
    description: 'Duration in minutes for live location sharing (default: 60)',
    example: 60,
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  liveDurationMinutes?: number;
}
