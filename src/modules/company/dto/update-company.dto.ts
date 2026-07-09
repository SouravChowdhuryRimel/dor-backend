import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { CompanyStatus } from '@prisma/client';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @ApiPropertyOptional({
    description: 'Company approval status',
    enum: CompanyStatus,
  })
  @IsEnum(CompanyStatus)
  @IsOptional()
  status?: CompanyStatus;
}
