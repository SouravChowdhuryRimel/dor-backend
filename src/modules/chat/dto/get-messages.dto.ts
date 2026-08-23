import { IsOptional, IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetMessagesDto {
  @ApiPropertyOptional({
    description: 'Limit the number of messages to fetch',
    default: 50,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description:
      'ISO-8601 timestamp to fetch messages created before this time (for cursor-based pagination)',
    example: '2026-08-22T12:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  before?: string;
}
