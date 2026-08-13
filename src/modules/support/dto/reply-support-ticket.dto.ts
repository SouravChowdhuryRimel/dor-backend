import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class ReplySupportTicketDto {
  @ApiProperty({
    description: 'Message body of the reply',
    example: 'Please check your internet connection and try again.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'Optional attachment URLs',
    example: ['image1.jpg'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  attachments?: string[];
}
