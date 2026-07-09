import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';

@Injectable()
export class PartyService {
  constructor(private readonly prisma: PrismaService) {}
}
