import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CompaniesService } from '../services/companies.service';
import { CompanySignupDto } from '../dto/company-signup.dto';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@ApiTags('Authentication')
@Controller('auth/company')
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Post('signup')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'tradeLicenseCopy', maxCount: 1 },
      { name: 'nidCopyFront', maxCount: 1 },
      { name: 'nidCopyBack', maxCount: 1 },
      { name: 'bankStatementCopy', maxCount: 1 },
    ]),
  )
  @ApiOperation({
    summary: 'Register a new company/merchant account (2-step Signup)',
    description:
      'Creates a company vendor user, generates a company profile, and returns an OTP validation token.',
  })
  @ApiBody({ type: CompanySignupDto })
  @ApiResponse({
    status: 201,
    description: 'Company successfully created, OTP initiated.',
  })
  signup(
    @Body() dto: CompanySignupDto,
    @UploadedFiles()
    files: {
      tradeLicenseCopy?: Express.Multer.File[];
      nidCopyFront?: Express.Multer.File[];
      nidCopyBack?: Express.Multer.File[];
      bankStatementCopy?: Express.Multer.File[];
    },
  ) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileFields = [
      'tradeLicenseCopy',
      'nidCopyFront',
      'nidCopyBack',
      'bankStatementCopy',
    ];
    for (const field of fileFields) {
      const fileArray = (files as any)?.[field];
      if (fileArray && fileArray.length > 0) {
        const file = fileArray[0];
        const ext = path.extname(file.originalname) || '.png';
        const uniqueName = `${randomUUID()}${ext}`;
        const filePath = path.join(uploadDir, uniqueName);
        fs.writeFileSync(filePath, file.buffer);
        (dto as any)[field] = `/uploads/${uniqueName}`;
      }
    }

    return this.companiesService.signUpCompany(dto);
  }
}

