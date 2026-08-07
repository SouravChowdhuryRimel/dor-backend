import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ComplaintStatus } from '@prisma/client';

export class UpdateComplaintStatusDto {
  @ApiProperty({
    description: 'The new status of the complaint',
    enum: ComplaintStatus,
    example: ComplaintStatus.RESOLVED,
  })
  @IsEnum(ComplaintStatus)
  status: ComplaintStatus;
}
