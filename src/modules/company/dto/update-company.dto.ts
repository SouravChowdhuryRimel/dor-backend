import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';

export class UpdateCompanyDto extends PartialType(
  OmitType(CreateCompanyDto, [
    'phoneNumber',
    'password',
    'categoryId',
  ] as const),
) {}
