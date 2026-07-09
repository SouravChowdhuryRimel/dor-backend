import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreatePartyDto {
  @ApiProperty({ description: 'Name of the party' })
  @IsString()
  @IsNotEmpty()
  partyName: string;

  @ApiProperty({ description: 'Phone number' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ description: 'Address of the party' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'District of the party' })
  @IsString()
  @IsNotEmpty()
  district: string;

  @ApiProperty({ description: 'Upozela of the party' })
  @IsString()
  @IsNotEmpty()
  upozela: string;

  @ApiProperty({ description: 'Description of the party' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Opening due amount' })
  @IsNumber()
  @IsNotEmpty()
  openingDue: number;

  @ApiProperty({ description: 'Credit limit amount' })
  @IsNumber()
  @IsNotEmpty()
  creditLimit: number;
}
