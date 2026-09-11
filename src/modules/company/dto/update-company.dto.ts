import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';
import { CompanyStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateCompanyDto extends PartialType(
  OmitType(CreateCompanyDto, [
    'phoneNumber',
    'password',
    'categoryId',
  ] as const),
) {
  @ApiPropertyOptional({ enum: CompanyStatus, description: 'Company status' })
  @IsEnum(CompanyStatus)
  @IsOptional()
  status?: CompanyStatus;
}
