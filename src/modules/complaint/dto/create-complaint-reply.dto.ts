import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateComplaintReplyDto {
  @ApiProperty({
    description: 'ID of the sender (e.g. user, company, or party ID)',
    example: 'user-or-company-uuid-string',
  })
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @ApiProperty({
    description: 'Role of the sender',
    enum: Role,
    example: Role.PARTY,
  })
  @IsEnum(Role)
  senderRole: Role;

  @ApiProperty({
    description: 'Name of the sender to display in the thread',
    example: 'Labib (Admin)',
  })
  @IsString()
  @IsNotEmpty()
  senderName: string;

  @ApiProperty({
    description: 'Body of the message/reply',
    example: 'We are looking into this delay and will get back to you shortly.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'Array of attached file paths',
    example: ['/uploads/documents/reply-123.jpg'],
    type: [String],
  })
  @IsOptional()
  attachments?: string[];
}
