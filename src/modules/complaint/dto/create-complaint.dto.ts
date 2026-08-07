import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class CreateComplaintDto {
  @ApiPropertyOptional({
    description: 'Unique friendly complaint ticket ID. If not provided, it will be auto-generated.',
    example: 'CMP-8842',
  })
  @IsString()
  @IsOptional()
  showComplaintId?: string;

  @ApiProperty({
    description: 'Title of the complaint',
    example: 'Delayed Delivery & Rude Behavior',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Detailed description of the issue',
    example: 'The delivery truck was delayed by 4 hours and the driver was extremely uncooperative.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Array of attached file paths (e.g. photos of damage, invoices)',
    example: ['/uploads/documents/doc-1234.jpg'],
    type: [String],
  })
  @IsOptional()
  attachments?: string[];

  @ApiProperty({
    description: 'ID of the client/party making the complaint',
    example: 'party-uuid-string',
  })
  @IsString()
  @IsNotEmpty()
  partyId: string;

  @ApiProperty({
    description: 'ID of the company being complained about',
    example: 'company-uuid-string',
  })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiPropertyOptional({
    description: 'ID of the order related to this complaint',
    example: 'order-uuid-string',
  })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional({
    description: 'ID of the driver related to this complaint',
    example: 'driver-uuid-string',
  })
  @IsString()
  @IsOptional()
  driverId?: string;
}
