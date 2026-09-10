import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AcceptOrderDto {
  @ApiProperty({
    description: 'Driver ID to assign to the order',
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
    required: false,
  })
  @IsOptional()
  @IsString()
  driverId?: string;
}
