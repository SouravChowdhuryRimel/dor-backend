import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateSupportTicketDto {
  @ApiProperty({
    description: 'Title of the support ticket',
    example: 'Unable to login to the app',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Detailed description of the issue',
    example: 'I am getting a timeout error every time I try to login.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;
}
