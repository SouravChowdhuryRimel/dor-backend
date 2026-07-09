import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/common/guards/access-token.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/constants/role.enum';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR)
  @ApiOperation({ summary: 'Create a new product (SUPER_ADMIN, ADMIN)' })
  @ApiResponse({ status: 201, description: 'Product successfully created.' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
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
  @ApiOperation({ summary: 'Update a product (SUPER_ADMIN, ADMIN)' })
  @ApiResponse({ status: 200, description: 'Product successfully updated.' })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
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
