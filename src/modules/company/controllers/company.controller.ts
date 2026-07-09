import { Controller } from '@nestjs/common';
import { CompanyService } from '../services/company.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}
}
