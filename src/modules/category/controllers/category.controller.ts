import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { CategoryService } from '../services/category.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/constants/role.enum';
import { AccessTokenGuard } from '../../../common/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PaginationQueryDto } from '../../../shared/pagination/pagination.util';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

const categoryImageUpload = {
  storage: diskStorage({
    destination: (req, file, callback) => {
      const path = './uploads/categories';
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
      callback(null, `category-${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
};

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Post()
  @UseInterceptors(FileInterceptor('categoryThumbnail', categoryImageUpload))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new category (SUPER_ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Category created successfully.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['categoryName'],
      properties: {
        categoryName: {
          type: 'string',
          description: 'The name of the category',
        },
        adminIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs of admins assigned to this category (optional)',
        },
        status: {
          type: 'string',
          enum: ['ACTIVE', 'INACTIVE'],
          default: 'ACTIVE',
          description: 'Status of the category (optional)',
        },
        categoryThumbnail: {
          type: 'string',
          format: 'binary',
          description: 'Category Thumbnail Image (optional)',
        },
      },
    },
  })
  create(
    @Body() createCategoryDto: CreateCategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      createCategoryDto.categoryThumbnail = `/uploads/categories/${file.filename}`;
    }
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all categories with optional search across name',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term matching category name',
  })
  @ApiResponse({ status: 200, description: 'Return all categories.' })
  findAll(@Query() query: PaginationQueryDto & { search?: string }) {
    return this.categoryService.findAll(query);
  }

  @Get(':id/companies')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get companies by category ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns companies in the category.',
  })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  findCompaniesByCategoryId(@Param('id') id: string) {
    return this.categoryService.findCompaniesByCategoryId(id);
  }

  @Get(':id/parties')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get parties by category ID' })
  @ApiResponse({ status: 200, description: 'Returns parties in the category.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  findPartiesByCategoryId(@Param('id') id: string) {
    return this.categoryService.findPartiesByCategoryId(id);
  }

  @Get(':id/drivers')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get drivers by category ID' })
  @ApiResponse({ status: 200, description: 'Returns drivers in the category.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  findDriversByCategoryId(@Param('id') id: string) {
    return this.categoryService.findDriversByCategoryId(id);
  }

  @Get(':id/sub_categories')
  @ApiOperation({ summary: 'Get sub-categories by category ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns sub-categories belonging to the category.',
  })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  findSubCategoriesByCategoryId(@Param('id') id: string) {
    return this.categoryService.findSubCategoriesByCategoryId(id);
  }

  @Get(':id/sub-categories')
  @ApiOperation({ summary: 'Get sub-categories by category ID (alias)' })
  @ApiResponse({
    status: 200,
    description: 'Returns sub-categories belonging to the category.',
  })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  findSubCategoriesByCategoryIdKebab(@Param('id') id: string) {
    return this.categoryService.findSubCategoriesByCategoryId(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Return the category.' })
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('categoryThumbnail', categoryImageUpload))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a category (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Category updated successfully.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        categoryName: {
          type: 'string',
          description: 'The name of the category (optional)',
        },
        adminIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs of admins assigned to this category (optional)',
        },
        status: {
          type: 'string',
          enum: ['ACTIVE', 'INACTIVE'],
          description: 'Status of the category (optional)',
        },
        categoryThumbnail: {
          type: 'string',
          format: 'binary',
          description: 'Category Thumbnail Image (optional)',
        },
      },
    },
  })
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      updateCategoryDto.categoryThumbnail = `/uploads/categories/${file.filename}`;
    }
    return this.categoryService.update(id, updateCategoryDto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Delete(':id/admins/:adminId')
  @ApiOperation({
    summary: 'Remove an admin from a category (SUPER_ADMIN only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin removed from category successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Category or association not found.',
  })
  removeAdmin(@Param('id') id: string, @Param('adminId') adminId: string) {
    return this.categoryService.removeAdmin(id, adminId);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully.' })
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}
