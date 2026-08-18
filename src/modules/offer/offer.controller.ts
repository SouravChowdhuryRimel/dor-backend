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

@ApiTags('Offers')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('offers')
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product offer' })
  @ApiResponse({ status: 201, description: 'Offer successfully created.' })
  create(@Body() createOfferDto: CreateOfferDto) {
    return this.offerService.create(createOfferDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all offers' })
  @ApiResponse({ status: 200, description: 'Return all offers.' })
  findAll(@Query() query: GetOffersQueryDto) {
    return this.offerService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an offer by ID' })
  @ApiResponse({ status: 200, description: 'Return offer details.' })
  @ApiResponse({ status: 404, description: 'Offer not found.' })
  findOne(@Param('id') id: string) {
    return this.offerService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an offer' })
  @ApiResponse({ status: 200, description: 'Offer successfully updated.' })
  @ApiResponse({ status: 404, description: 'Offer not found.' })
  update(@Param('id') id: string, @Body() updateOfferDto: UpdateOfferDto) {
    return this.offerService.update(id, updateOfferDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an offer' })
  @ApiResponse({ status: 200, description: 'Offer successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Offer not found.' })
  remove(@Param('id') id: string) {
    return this.offerService.remove(id);
  }
}
