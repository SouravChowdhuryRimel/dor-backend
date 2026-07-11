import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { DriverService } from '../services/driver.service';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CreateDriverDto } from '../dto/create-driver.dto';
import { UpdateDriverDto } from '../dto/update-driver.dto';
import { AccessTokenGuard } from '../../../common/guards/access-token.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@ApiTags('Drivers')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('drivers')
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('driverDocument', 10, {
      storage: diskStorage({
        destination: (req, file, callback) => {
          const path = './uploads/documents';
          if (!fs.existsSync(path)) {
            fs.mkdirSync(path, { recursive: true });
          }
          callback(null, path);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `driver-doc-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phoneNumber: { type: 'string' },
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
        driverDocument: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
      required: ['phoneNumber', 'email', 'password'],
    },
  })
  @ApiOperation({ summary: 'Create a new driver' })
  create(
    @Body() createDriverDto: CreateDriverDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (files && files.length > 0) {
      createDriverDto.driverDocument = files.map(
        (file) => `/uploads/documents/${file.filename}`,
      );
    } else {
      createDriverDto.driverDocument = [];
    }
    return this.driverService.create(createDriverDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all drivers' })
  findAll() {
    return this.driverService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a driver by ID' })
  findOne(@Param('id') id: string) {
    return this.driverService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a driver' })
  update(@Param('id') id: string, @Body() updateDriverDto: UpdateDriverDto) {
    return this.driverService.update(id, updateDriverDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a driver' })
  remove(@Param('id') id: string) {
    return this.driverService.remove(id);
  }
}
