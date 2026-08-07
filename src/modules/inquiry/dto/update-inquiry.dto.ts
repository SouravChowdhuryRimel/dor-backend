import { PartialType } from '@nestjs/swagger';
import { CreateInquiryDto } from './create-inquiry.dto';

export class UpdateInquiryDto extends PartialType(CreateInquiryDto) {}
