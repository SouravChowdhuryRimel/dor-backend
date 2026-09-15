import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/pagination/pagination.util';

export class QueryNotificationDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by read status: "true" for read, "false" for unread',
    example: 'false',
    required: false,
  })
  @IsOptional()
  @IsBooleanString()
  isRead?: string;
}
