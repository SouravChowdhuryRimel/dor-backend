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
  Query,
  Req,
} from '@nestjs/common';
import { PaginationQueryDto } from '../../shared/pagination/pagination.util';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SetPartyProductRateDto } from './dto/set-party-rate.dto';
import { UpdatePartyProductRateDto } from './dto/update-party-rate.dto';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/common/guards/access-token.guard';
import { OptionalAccessTokenGuard } from 'src/common/guards/optional-access-token.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/constants/role.enum';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { PackagingType, UnitType } from '@prisma/client';


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
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @UseInterceptors(FilesInterceptor('productImage', 10, productImageUpload))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new product (VENDOR)' })
  @ApiResponse({ status: 201, description: 'Product successfully created.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'productName',
        'unit',
        'bagSize',
        'packagingType',
        'unitType',
        'regularPrice',
        'offerPrice',
        'minimumOrder',
        'description',
        'stockSize',
        'subCategoryId',
      ],
      properties: {
        productImage: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
        productName: { type: 'string' },
        unit: { type: 'string' },
        bagSize: { type: 'string' },
        packagingType: { type: 'string', enum: Object.values(PackagingType) },
        unitType: { type: 'string', enum: Object.values(UnitType) },
        defaultPrice: {
          type: 'number',
          description: 'Legacy, falls back to offerPrice',
        },
        regularPrice: { type: 'number' },
        offerPrice: { type: 'number' },
        minimumOrder: { type: 'number' },
        description: { type: 'string' },
        stockSize: { type: 'number' },
        subCategoryId: { type: 'string' },
        companyId: { type: 'string', description: 'Associated company ID' },
      },
    },
  })
  create(
    @Body() data: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    if (files && files.length > 0) {
      data.productImage = files.map(
        (file) => `/uploads/products/${file.filename}`,
      );
    } else if (data.productImage) {
      if (typeof data.productImage === 'string') {
        data.productImage = [data.productImage];
      }
    } else {
      data.productImage = [];
    }
    return this.productService.create(data, req.user);
  }

  @Post('party-rates')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR)
  @ApiOperation({
    summary: 'Set customized rate for a product and party',
  })
  @ApiResponse({
    status: 200,
    description: 'Product party rate successfully set.',
  })
  setPartyRate(@Body() dto: SetPartyProductRateDto, @Req() req: any) {
    return this.productService.setPartyRate(dto, req.user);
  }

  @Patch('party-rates')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR)
  @ApiOperation({
    summary: 'Update customized rate for a product and party',
  })
  @ApiResponse({
    status: 200,
    description: 'Product party rate successfully updated.',
  })
  updatePartyRate(@Body() dto: UpdatePartyProductRateDto, @Req() req: any) {
    return this.productService.setPartyRate(dto, req.user);
  }

  @Get('party-rates/:partyId')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Get customized rates list of all products for a specific party',
  })
  @ApiResponse({ status: 200, description: 'Return rates list.' })
  getPartyRates(
    @Param('partyId') partyId: string,
    @Req() req: any,
    @Query('companyId') companyId?: string,
  ) {
    return this.productService.getPartyRates(partyId, companyId, req.user);
  }

  @Get(':productId/party-rates')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR)
  @ApiOperation({
    summary: 'Get all custom rates set for a specific product',
  })
  @ApiResponse({
    status: 200,
    description: 'Return list of custom party rates.',
  })
  getProductPartyRates(@Param('productId') productId: string, @Req() req: any) {
    return this.productService.getProductPartyRates(productId, req.user);
  }

  @Get(':productId/party-rates/:partyId')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR, Role.PARTY)
  @ApiOperation({
    summary: 'Get the custom rate of a specific product for a specific party',
  })
  @ApiResponse({
    status: 200,
    description: 'Return custom party rate details.',
  })
  getSingleProductPartyRate(
    @Param('productId') productId: string,
    @Param('partyId') partyId: string,
    @Req() req: any,
  ) {
    return this.productService.getSingleProductPartyRate(
      productId,
      partyId,
      req.user,
    );
  }

  @Delete(':productId/party-rates/:partyId')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR)
  @ApiOperation({
    summary: 'Delete custom rate for a specific product and party',
  })
  @ApiResponse({
    status: 200,
    description: 'Custom rate successfully deleted.',
  })
  deletePartyRate(
    @Param('productId') productId: string,
    @Param('partyId') partyId: string,
    @Req() req: any,
  ) {
    return this.productService.deletePartyRate(productId, partyId, req.user);
  }

  @Get('low-stock')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR)
  @ApiOperation({
    summary:
      'Get list of products with low stock (out of stock or below min order)',
  })
  @ApiResponse({ status: 200, description: 'Return low stock products.' })
  findLowStock(@Query() query: PaginationQueryDto, @Req() req: any) {
    return this.productService.findLowStock(query, req.user);
  }

  @Get('sub-category/:subCategoryId')
  @UseGuards(OptionalAccessTokenGuard)
  @ApiOperation({ summary: 'Get all public products by subcategory ID' })
  @ApiResponse({ status: 200, description: 'Return subcategory products.' })
  findSubCategoryProducts(
    @Param('subCategoryId') subCategoryId: string,
    @Query() query: PaginationQueryDto,
    @Req() req: any,
  ) {
    return this.productService.findSubCategoryProducts(
      subCategoryId,
      query,
      req.user,
    );
  }

  @Get('company/:companyId')
  @UseGuards(OptionalAccessTokenGuard)
  @ApiOperation({
    summary: 'Get products belonging to a company with filters and search',
  })
  @ApiResponse({ status: 200, description: 'Return company products.' })
  findCompanyProducts(
    @Param('companyId') companyId: string,
    @Query() query: GetProductsQueryDto,
    @Req() req: any,
  ) {
    return this.productService.findCompanyProducts(companyId, query, req.user);
  }

  @Get('my-products')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiOperation({
    summary: "Get products belonging to the logged-in vendor's company",
  })
  @ApiResponse({
    status: 200,
    description: "Return vendor's company products.",
  })
  findMyProducts(@Req() req: any, @Query() query: GetProductsQueryDto) {
    const companyId = req.user.sub;
    return this.productService.findCompanyProducts(companyId, query, req.user);
  }

  @Get()
  @UseGuards(OptionalAccessTokenGuard)
  @ApiOperation({
    summary:
      'Get all products with fuzzy search, subcategory, price filtering, and sorting',
  })
  @ApiResponse({ status: 200, description: 'Return all products.' })
  findAll(@Query() query: GetProductsQueryDto, @Req() req: any) {
    return this.productService.findAll(query, req.user);
  }

  @Get(':id')
  @UseGuards(OptionalAccessTokenGuard)
  @ApiOperation({
    summary: 'Get product by ID (Public / Restricted for Vendor)',
  })
  @ApiResponse({ status: 200, description: 'Return a product by ID.' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.productService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR)
  @UseInterceptors(FilesInterceptor('productImage', 10, productImageUpload))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a product (SUPER_ADMIN, ADMIN, VENDOR)' })
  @ApiResponse({ status: 200, description: 'Product successfully updated.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productImage: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
        productName: { type: 'string' },
        unit: { type: 'string' },
        bagSize: { type: 'string' },
        packagingType: { type: 'string', enum: Object.values(PackagingType) },
        unitType: { type: 'string', enum: Object.values(UnitType) },
        defaultPrice: { type: 'number' },
        regularPrice: { type: 'number' },
        offerPrice: { type: 'number' },
        minimumOrder: { type: 'number' },
        description: { type: 'string' },
        stockSize: { type: 'number' },
        subCategoryId: { type: 'string' },
        companyId: { type: 'string' },
      },
    },
  })
  update(
    @Param('id') id: string,
    @Body() data: UpdateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    if (files?.length) {
      data.productImage = files.map(
        (file) => `/uploads/products/${file.filename}`,
      );
    }
    return this.productService.update(id, data, req.user);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR)
  @ApiOperation({ summary: 'Delete a product (SUPER_ADMIN, ADMIN, VENDOR)' })
  @ApiResponse({ status: 200, description: 'Product successfully deleted.' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.productService.remove(id, req.user);
  }
}
