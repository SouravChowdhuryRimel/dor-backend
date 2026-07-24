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
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/common/guards/access-token.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/constants/role.enum';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

const productImageUpload = {
  storage: diskStorage({
    destination: (req, file, callback) => {
      const path = './uploads/products';
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
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      callback(null, `product-${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
};

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR)
  @UseInterceptors(FilesInterceptor('productImage', 10, productImageUpload))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new product (SUPER_ADMIN, ADMIN)' })
  @ApiResponse({ status: 201, description: 'Product successfully created.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'productName', 'unit', 'bagSize', 'defaultPrice', 'minimumOrder',
        'description', 'stockSize', 'subCategoryId',
      ],
      properties: {
        productImage: { type: 'array', items: { type: 'string', format: 'binary' } },
        productName: { type: 'string' }, unit: { type: 'string' },
        bagSize: { type: 'string' }, defaultPrice: { type: 'number' },
        minimumOrder: { type: 'number' }, description: { type: 'string' },
        stockSize: { type: 'number' }, subCategoryId: { type: 'string' },
      },
    },
  })
  create(@Body() data: CreateProductDto, @UploadedFiles() files: Express.Multer.File[]) {
    data.productImage = files?.map((file) => `/uploads/products/${file.filename}`) ?? [];
    return this.productService.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products (Public)' })
  @ApiResponse({ status: 200, description: 'Return all products.' })
  findAll() {
    return this.productService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Return a product by ID.' })
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR)
  @UseInterceptors(FilesInterceptor('productImage', 10, productImageUpload))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a product (SUPER_ADMIN, ADMIN)' })
  @ApiResponse({ status: 200, description: 'Product successfully updated.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productImage: { type: 'array', items: { type: 'string', format: 'binary' } },
        productName: { type: 'string' }, unit: { type: 'string' },
        bagSize: { type: 'string' }, defaultPrice: { type: 'number' },
        minimumOrder: { type: 'number' }, description: { type: 'string' },
        stockSize: { type: 'number' }, subCategoryId: { type: 'string' },
      },
    },
  })
  update(
    @Param('id') id: string,
    @Body() data: UpdateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (files?.length) {
      data.productImage = files.map((file) => `/uploads/products/${file.filename}`);
    }
    return this.productService.update(id, data);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR)
  @ApiOperation({ summary: 'Delete a product (SUPER_ADMIN, ADMIN)' })
  @ApiResponse({ status: 200, description: 'Product successfully deleted.' })
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}
