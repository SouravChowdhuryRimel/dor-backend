import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AssignDriverDto {
  @ApiProperty({
    description: 'Driver ID to assign to the order (or null/empty to remove)',
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'driverId must be a string' })
  driverId?: string | null;
}
