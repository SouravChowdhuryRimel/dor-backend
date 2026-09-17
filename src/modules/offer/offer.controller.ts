import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OfferService } from './offer.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { GetOffersQueryDto } from './dto/get-offers-query.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/role.enum';

@ApiTags('Offers')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('offers')
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.VENDOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new product offer' })
  @ApiResponse({ status: 201, description: 'Offer successfully created.' })
  create(@Body() createOfferDto: CreateOfferDto, @Req() req: any) {
    return this.offerService.create(createOfferDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all offers' })
  @ApiResponse({ status: 200, description: 'Return all offers.' })
  findAll(@Query() query: GetOffersQueryDto, @Req() req: any) {
    return this.offerService.findAll(query, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an offer by ID' })
  @ApiResponse({ status: 200, description: 'Return offer details.' })
  @ApiResponse({ status: 404, description: 'Offer not found.' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.offerService.findOne(id, req.user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.VENDOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update an offer' })
  @ApiResponse({ status: 200, description: 'Offer successfully updated.' })
  @ApiResponse({ status: 404, description: 'Offer not found.' })
  update(
    @Param('id') id: string,
    @Body() updateOfferDto: UpdateOfferDto,
    @Req() req: any,
  ) {
    return this.offerService.update(id, updateOfferDto, req.user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.VENDOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete an offer' })
  @ApiResponse({ status: 200, description: 'Offer successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Offer not found.' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.offerService.remove(id, req.user);
  }
}
