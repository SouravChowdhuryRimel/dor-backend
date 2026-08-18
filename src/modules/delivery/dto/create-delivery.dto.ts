import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { DeliveryStatus } from '@prisma/client';

export class CreateDeliveryDto {
  @ApiProperty({
    description: 'Detailed address for delivery',
    example: '123 New Road, Bazzar Area',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: 'Upazila/Upozela of delivery address',
    example: 'Savar',
  })
  @IsString()
  @IsNotEmpty()
  upozela: string;

  @ApiProperty({
    description: 'District of delivery address',
    example: 'Dhaka',
  })
  @IsString()
  @IsNotEmpty()
  district: string;

  @ApiProperty({
    description: 'Delivery notes/description',
    example: 'Deliver by morning, handle with care.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Scheduled delivery date/time (ISO string)',
    example: '2026-08-05T10:00:00.000Z',
  })
  @IsDateString()
  deliveryTime: string;

  @ApiPropertyOptional({
    description: 'Current status of the delivery',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  @IsEnum(DeliveryStatus)
  @IsOptional()
  status?: DeliveryStatus;

  @ApiPropertyOptional({
    description: 'Time when delivery started (ISO string)',
    example: '2026-08-05T09:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  startDeliveryTime?: string;

  @ApiPropertyOptional({
    description: 'Time when delivery was completed (ISO string)',
    example: '2026-08-05T12:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  endDeliveryTime?: string;

  @ApiPropertyOptional({
    description: 'ID of the driver assigned to this delivery',
    example: 'driver-uuid-string',
  })
  @IsString()
  @IsOptional()
  driverId?: string;

  @ApiPropertyOptional({
    description: 'Current real-time location or landmark of the delivery',
    example: 'বনানী ওভারপাস পার হচ্ছে (Passing Banani overpass)',
  })
  @IsString()
  @IsOptional()
  currentLocation?: string;

  @ApiPropertyOptional({
    description: 'ID of the associated order',
    example: 'order-uuid-string',
  })
  @IsString()
  @IsOptional()
  orderId?: string;
}
