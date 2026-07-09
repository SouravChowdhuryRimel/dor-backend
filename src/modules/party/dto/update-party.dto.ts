import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatePartyDto } from './create-party.dto';
import { IsString, IsOptional } from 'class-validator';

export class UpdatePartyDto extends PartialType(CreatePartyDto) {
  @ApiPropertyOptional({ description: 'Status of the party (ACTIVE/INACTIVE)' })
  @IsString()
  @IsOptional()
  status?: string;
}
