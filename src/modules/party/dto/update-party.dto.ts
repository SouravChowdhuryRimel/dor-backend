import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatePartyDto } from './create-party.dto';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdatePartyDto extends PartialType(CreatePartyDto) {
  @ApiPropertyOptional({ description: 'Status of the party (ACTIVE/INACTIVE)' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Opening due amount', example: 0 })
  @IsNumber()
  @IsOptional()
  openingDue?: number;

  @ApiPropertyOptional({ description: 'Credit limit amount', example: 50000 })
  @IsNumber()
  @IsOptional()
  creditLimit?: number;

  @ApiPropertyOptional({ description: 'Company ID this party belongs to' })
  @IsString()
  @IsOptional()
  companyId?: string;
}
