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
import { PartyService } from '../services/party.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreatePartyDto } from '../dto/create-party.dto';
import { UpdatePartyDto } from '../dto/update-party.dto';
import { AccessTokenGuard } from '../../../common/guards/access-token.guard';

@ApiTags('Parties')
@Controller('parties')
export class PartyController {
  constructor(private readonly partyService: PartyService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new Party' })
  register(@Body() createPartyDto: CreatePartyDto) {
    return this.partyService.create(createPartyDto);
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
