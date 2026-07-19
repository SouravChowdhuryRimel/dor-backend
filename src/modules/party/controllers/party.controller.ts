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
  BadRequestException,
} from '@nestjs/common';
import { PartyService } from '../services/party.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CreatePartyDto } from '../dto/create-party.dto';
import { UpdatePartyDto } from '../dto/update-party.dto';
import { AccessTokenGuard } from '../../../common/guards/access-token.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@ApiTags('Parties')
@Controller('parties')
export class PartyController {
  constructor(private readonly partyService: PartyService) {}

  @Post('register')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'partyDocument', maxCount: 10 },
        { name: 'documents', maxCount: 10 },
      ],
      {
        storage: diskStorage({
          destination: (req, file, callback) => {
            const path = './uploads/documents';
            try {
              if (!fs.existsSync(path)) {
                fs.mkdirSync(path, { recursive: true });
              }
              callback(null, path);
            } catch (error) {
              callback(error as Error, path);
            }
          },
          filename: (req, file, callback) => {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `party-doc-${uniqueSuffix}${ext}`);
          },
        }),
      },
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        partyName: { type: 'string' },
        businessName: { type: 'string' },
        phoneNumber: { type: 'string' },
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
        address: { type: 'string' },
        district: { type: 'string' },
        upozela: { type: 'string' },
        bazzarArea: { type: 'string', description: 'Bazzar/Area' },
        bazzar: { type: 'string', description: 'Bazzar (alias)' },
        area: { type: 'string', description: 'Area (alias)' },
        description: { type: 'string' },
        openingDue: { type: 'number' },
        creditLimit: { type: 'number' },
        partyDocument: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        documents: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'documents (alias)',
        },
      },
      required: [
        'partyName',
        'businessName',
        'phoneNumber',
        'email',
        'password',
        'address',
        'district',
        'upozela',
        'description',
        'openingDue',
        'creditLimit',
      ],
    },
  })
  @ApiOperation({ summary: 'Register a new Party' })
  register(
    @Body() createPartyDto: CreatePartyDto,
    @UploadedFiles()
    files: {
      partyDocument?: Express.Multer.File[];
      documents?: Express.Multer.File[];
    },
  ) {
    let uploadedDocs: string[] = [];
    if (files) {
      if (files.partyDocument && files.partyDocument.length > 0) {
        uploadedDocs = uploadedDocs.concat(
          files.partyDocument.map((file) => `/uploads/documents/${file.filename}`),
        );
      }
      if (files.documents && files.documents.length > 0) {
        uploadedDocs = uploadedDocs.concat(
          files.documents.map((file) => `/uploads/documents/${file.filename}`),
        );
      }
    }
    createPartyDto.partyDocument = uploadedDocs;

    // Normalize bazzarArea
    const bazzarAreaValue = createPartyDto.bazzarArea || createPartyDto.bazzar || createPartyDto.area;
    if (!bazzarAreaValue) {
      throw new BadRequestException('bazzarArea, bazzar, or area is required');
    }

    // Convert openingDue and creditLimit to numbers in case they were sent as strings in form-data
    const openingDue = Number(createPartyDto.openingDue);
    const creditLimit = Number(createPartyDto.creditLimit);

    const normalizedDto: any = {
      ...createPartyDto,
      bazzarArea: bazzarAreaValue,
      openingDue: isNaN(openingDue) ? 0 : openingDue,
      creditLimit: isNaN(creditLimit) ? 0 : creditLimit,
    };

    // Remove alias properties
    delete normalizedDto.bazzar;
    delete normalizedDto.area;
    delete normalizedDto.documents;

    return this.partyService.create(normalizedDto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  findAll() {
    return this.partyService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a party by ID' })
  findOne(@Param('id') id: string) {
    return this.partyService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a party' })
  update(@Param('id') id: string, @Body() updatePartyDto: UpdatePartyDto) {
    return this.partyService.update(id, updatePartyDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a party' })
  remove(@Param('id') id: string) {
    return this.partyService.remove(id);
  }
}
