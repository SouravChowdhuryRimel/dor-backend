import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/pagination/pagination.util';

export class GetActivityLogsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by actor type (ADMIN, COMPANY, PARTY, DRIVER)' })
  @IsString()
  @IsOptional()
  actorType?: string;

  @ApiPropertyOptional({ description: 'Filter by actor ID' })
  @IsString()
  @IsOptional()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Filter by action name' })
  @IsString()
  @IsOptional()
  action?: string;
}
