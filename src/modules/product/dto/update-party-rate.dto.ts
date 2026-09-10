import { PartialType } from '@nestjs/swagger';
import { SetPartyProductRateDto } from './set-party-rate.dto';

export class UpdatePartyProductRateDto extends PartialType(
  SetPartyProductRateDto,
) {}
