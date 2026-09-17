import { IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLiveLocationDto {
  @ApiProperty({
    description: 'Updated latitude coordinate',
    example: 23.815,
  })
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @ApiProperty({
    description: 'Updated longitude coordinate',
    example: 90.418,
  })
  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @ApiPropertyOptional({
    description: 'Set to true to stop sharing live location early',
    example: false,
  })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  isStop?: boolean;
}
