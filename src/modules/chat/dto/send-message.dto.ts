import { IsOptional, IsString } from 'class-validator';
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
}
