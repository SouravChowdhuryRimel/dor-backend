import {
  Controller,
  Post,
  Body,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsOptional, IsString } from 'class-validator';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

class UploadDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File to upload (binary file for multipart/form-data) OR base64 string/URI for application/json',
  })
  @IsOptional()
  file?: any;

  @ApiPropertyOptional({
    description: 'File name (optional, used primarily for base64 uploads)',
    example: 'my-file.png',
  })
  @IsString()
  @IsOptional()
  fileName?: string;
}

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  @Post()
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload a file (supports form-data and base64)',
    description:
      'Accepts a binary file via multipart/form-data OR a base64 string/URI via application/json, saves it locally, and returns the file URL.',
  })
  @ApiBody({ type: UploadDto })
  @ApiResponse({ status: 201, description: 'File uploaded successfully.' })
  async uploadFile(
    @UploadedFile() uploadedFile?: Express.Multer.File,
    @Body() uploadDto?: UploadDto,
  ) {
    try {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Scenario 1: Multipart form-data file upload
      if (uploadedFile) {
        const ext = path.extname(uploadedFile.originalname) || '.png';
        const uniqueName = `${randomUUID()}${ext}`;
        const filePath = path.join(uploadDir, uniqueName);
        fs.writeFileSync(filePath, uploadedFile.buffer);

        return {
          url: `/uploads/${uniqueName}`,
        };
      }

      // Scenario 2: Base64 upload
      const file = uploadDto?.file;
      const fileName = uploadDto?.fileName;

      if (!file) {
        throw new BadRequestException('File content is required (binary or base64)');
      }

      // Check if file is a data URI, extract mime type and raw base64 data
      let base64Data = file;
      let extension = '.png'; // Default extension

      const matches = file.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        base64Data = matches[2];
        
        // Map common mime types to extensions
        if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
          extension = '.jpg';
        } else if (mimeType.includes('pdf')) {
          extension = '.pdf';
        } else if (mimeType.includes('png')) {
          extension = '.png';
        }
      } else if (fileName) {
        const ext = path.extname(fileName);
        if (ext) extension = ext;
      }

      const uniqueName = `${randomUUID()}${extension}`;
      const filePath = path.join(uploadDir, uniqueName);
      const buffer = Buffer.from(base64Data, 'base64');
      await fs.promises.writeFile(filePath, buffer);

      return {
        url: `/uploads/${uniqueName}`,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }
}
