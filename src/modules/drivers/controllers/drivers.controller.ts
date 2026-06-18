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
import { DriversService } from '../services/drivers.service';
import { DriverSignupDto } from '../dto/driver-signup.dto';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@ApiTags('Authentication')
@Controller('auth/driver')
export class DriversController {
  constructor(private driversService: DriversService) {}

  @Post('signup')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'avatar', maxCount: 1 },
      { name: 'nidCopyFront', maxCount: 1 },
      { name: 'nidCopyBack', maxCount: 1 },
      { name: 'drivingLicenseCopy', maxCount: 1 },
      { name: 'truckPhoto', maxCount: 1 },
    ]),
  )
  @ApiOperation({
    summary: 'Register a new driver account (3-step Signup)',
    description:
      'Creates a driver user, generates a driver profile, and returns an OTP validation token.',
  })
  @ApiBody({ type: DriverSignupDto })
  @ApiResponse({
    status: 201,
    description: 'Driver successfully created, OTP initiated.',
  })
  signup(
    @Body() dto: DriverSignupDto,
    @UploadedFiles()
    files: {
      avatar?: Express.Multer.File[];
      nidCopyFront?: Express.Multer.File[];
      nidCopyBack?: Express.Multer.File[];
      drivingLicenseCopy?: Express.Multer.File[];
      truckPhoto?: Express.Multer.File[];
    },
  ) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileFields = [
      'avatar',
      'nidCopyFront',
      'nidCopyBack',
      'drivingLicenseCopy',
      'truckPhoto',
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

    return this.driversService.signUpDriver(dto);
  }
}


