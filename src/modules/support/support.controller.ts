import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { ReplySupportTicketDto } from './dto/reply-support-ticket.dto';
import { GetSupportTicketsDto } from './dto/get-support-tickets.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';

@ApiTags('Support Tickets')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('support/tickets')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new support ticket' })
  @ApiResponse({ status: 201, description: 'Support ticket successfully created.' })
  create(@Body() createTicketDto: CreateSupportTicketDto, @Req() req: any) {
    return this.supportService.createTicket(createTicketDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all support tickets (filtered/paginated)' })
  @ApiResponse({ status: 200, description: 'Return support tickets.' })
  findAll(@Query() query: GetSupportTicketsDto, @Req() req: any) {
    return this.supportService.findAll(query, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get support ticket details and conversation messages' })
  @ApiResponse({ status: 200, description: 'Return support ticket details.' })
  @ApiResponse({ status: 404, description: 'Support ticket not found.' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.supportService.findOne(id, req.user);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Reply to a support ticket' })
  @ApiResponse({ status: 201, description: 'Reply message successfully sent.' })
  @ApiResponse({ status: 404, description: 'Support ticket not found.' })
  reply(
    @Param('id') id: string,
    @Body() replyDto: ReplySupportTicketDto,
    @Req() req: any,
  ) {
    return this.supportService.replyTicket(id, replyDto, req.user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update support ticket status' })
  @ApiResponse({ status: 200, description: 'Support ticket status successfully updated.' })
  @ApiResponse({ status: 404, description: 'Support ticket not found.' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Req() req: any,
  ) {
    return this.supportService.updateStatus(id, status, req.user);
  }
}
