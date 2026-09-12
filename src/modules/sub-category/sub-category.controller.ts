import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { QuerySubCategoryDto } from './dto/query-sub-category.dto';
import { SubCategoryService } from './sub-category.service';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';
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

@ApiTags('SubCategories')
@Controller('sub_categories')
export class SubCategoryController {
  constructor(private readonly subCategoryService: SubCategoryService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR)
  @ApiOperation({ summary: 'Create a new SubCategory (SUPER_ADMIN, ADMIN)' })
  @ApiResponse({
    status: 201,
    description: 'SubCategory successfully created.',
  })
  create(@Body() createSubCategoryDto: CreateSubCategoryDto) {
    return this.subCategoryService.create(createSubCategoryDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all SubCategories or filter by categoryId (Public)',
  })
  @ApiResponse({ status: 200, description: 'Return all sub-categories.' })
  findAll(@Query() query: QuerySubCategoryDto) {
    return this.subCategoryService.findAll(query);
  }

  @Get('category/:categoryId')
  @ApiOperation({
    summary: 'Get all SubCategories by parent Category ID (Public)',
  })
  @ApiResponse({
    status: 200,
    description: 'Return all sub-categories belonging to categoryId.',
  })
  findByCategoryId(
    @Param('categoryId') categoryId: string,
    @Query() query: QuerySubCategoryDto,
  ) {
    return this.subCategoryService.findAll({ ...query, categoryId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get SubCategory by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Return a sub-category by ID.' })
  findOne(@Param('id') id: string) {
    return this.subCategoryService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR)
  @ApiOperation({ summary: 'Update a SubCategory (SUPER_ADMIN, ADMIN)' })
  @ApiResponse({
    status: 200,
    description: 'SubCategory successfully updated.',
  })
  update(
    @Param('id') id: string,
    @Body() updateSubCategoryDto: UpdateSubCategoryDto,
  ) {
    return this.subCategoryService.update(id, updateSubCategoryDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR)
  @ApiOperation({ summary: 'Delete a SubCategory (SUPER_ADMIN, ADMIN)' })
  @ApiResponse({
    status: 200,
    description: 'SubCategory successfully deleted.',
  })
  remove(@Param('id') id: string) {
    return this.subCategoryService.remove(id);
  }
}
