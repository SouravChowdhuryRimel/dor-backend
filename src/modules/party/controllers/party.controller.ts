import { Controller } from '@nestjs/common';
import { PartyService } from '../services/party.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Parties')
@Controller('parties')
export class PartyController {
  constructor(private readonly partyService: PartyService) {}
}
