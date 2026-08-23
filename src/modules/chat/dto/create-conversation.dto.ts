import { IsNotEmpty, IsUUID, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({
    description:
      'The unique ID of the participant to start a conversation with',
    example: 'd3b07384-d113-49c3-a309-8d14beeae001',
  })
  @IsUUID()
  @IsNotEmpty()
  receiverId: string;

  @ApiProperty({
    description: 'The role of the participant',
    enum: Role,
    example: 'VENDOR',
  })
  @IsEnum(Role)
  @IsNotEmpty()
  receiverRole: Role;
}
