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
import { PartiesService } from '../services/parties.service';
import { PartySignupDto } from '../dto/party-signup.dto';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@ApiTags('Authentication')
@Controller('auth/party')
export class PartiesController {
  constructor(private partiesService: PartiesService) {}

  @Post('signup')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'businessDocument', maxCount: 1 },
    ]),
  )
  @ApiOperation({
    summary: 'Register a new party/merchant account (2-step Signup)',
    description:
      'Creates a party user, generates a party profile, and returns an OTP validation token.',
  })
  @ApiBody({ type: PartySignupDto })
  @ApiResponse({
    status: 201,
    description: 'Party successfully created, OTP initiated.',
  })
  signup(
    @Body() dto: PartySignupDto,
    @UploadedFiles()
    files: {
      businessDocument?: Express.Multer.File[];
    },
  ) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileFields = [
      'businessDocument',
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

    return this.partiesService.signUpParty(dto);
  }
}

