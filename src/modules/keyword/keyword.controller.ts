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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { KeywordService } from './keyword.service';
import { CreateKeywordDto } from './dto/create-keyword.dto';
import { UpdateKeywordDto } from './dto/update-keyword.dto';
import { QueryKeywordDto } from './dto/query-keyword.dto';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/role.enum';

@ApiTags('Keywords')
@Controller('keywords')
export class KeywordController {
  constructor(private readonly keywordService: KeywordService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: 'Add one or more global keywords to the master list (ADMIN/SUPER_ADMIN only)',
    description:
      'Creates new global keywords. Accepts a single "name" or an array of "names" for bulk creation. Duplicate names are safely ignored.',
  })
  @ApiResponse({ status: 201, description: 'Keywords created successfully.' })
  create(@Body() createKeywordDto: CreateKeywordDto) {
    return this.keywordService.create(createKeywordDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Search and list global keywords (Public / For Sellers & Buyers)',
    description:
      'Returns paginated or complete global keywords list. Sellers and Buyers use this endpoint to search (?search=...) and select tags.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for keyword name',
  })
  @ApiQuery({
    name: 'all',
    required: false,
    description: 'Pass "true" to retrieve all keywords without pagination',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description:
      'Field to sort by: "popularity" (default, based on company profile usage count), "name", or "createdAt"',
    enum: ['popularity', 'name', 'createdAt'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order: "desc" (default for popularity) or "asc"',
    enum: ['asc', 'desc'],
  })
  @ApiResponse({ status: 200, description: 'Return keywords list.' })
  findAll(@Query() query: QueryKeywordDto) {
    return this.keywordService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a global keyword by ID' })
  @ApiResponse({ status: 200, description: 'Return keyword details.' })
  @ApiResponse({ status: 404, description: 'Keyword not found.' })
  findOne(@Param('id') id: string) {
    return this.keywordService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update a global keyword name (ADMIN/SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Keyword updated successfully.' })
  @ApiResponse({ status: 404, description: 'Keyword not found.' })
  @ApiResponse({ status: 409, description: 'Keyword name already exists.' })
  update(@Param('id') id: string, @Body() updateKeywordDto: UpdateKeywordDto) {
    return this.keywordService.update(id, updateKeywordDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Delete a global keyword from the master list (ADMIN/SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Keyword deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Keyword not found.' })
  remove(@Param('id') id: string) {
    return this.keywordService.remove(id);
  }
}
