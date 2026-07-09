import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}
}
