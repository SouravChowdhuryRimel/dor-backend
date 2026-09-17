import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchChatUsersQueryDto {
  @ApiPropertyOptional({
    description:
      'Search string to filter by name, phone number, email, or business name',
    example: 'Karim',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Filter search explicitly by target role (ADMIN, VENDOR, PARTY, DRIVER)',
    enum: Role,
    example: Role.VENDOR,
  })
  @IsOptional()
  @IsEnum(Role)
  targetRole?: Role;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
