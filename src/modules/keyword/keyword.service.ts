import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/database.service';
import { CreateKeywordDto } from './dto/create-keyword.dto';
import { UpdateKeywordDto } from './dto/update-keyword.dto';
import { QueryKeywordDto } from './dto/query-keyword.dto';
import { createPaginatedResponse } from '../../shared/pagination/pagination.util';

@Injectable()
export class KeywordService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createKeywordDto: CreateKeywordDto) {
    const rawNames: string[] = [];
    if (createKeywordDto.name && createKeywordDto.name.trim()) {
      rawNames.push(createKeywordDto.name.trim());
    }
    if (createKeywordDto.names && Array.isArray(createKeywordDto.names)) {
      createKeywordDto.names.forEach((n) => {
        if (n && n.trim()) rawNames.push(n.trim());
      });
    }

    const uniqueNames = Array.from(new Set(rawNames));
    if (uniqueNames.length === 0) {
      throw new BadRequestException('Please provide at least one keyword name');
    }

    // Insert new keywords, skipping existing ones
    await this.prisma.keyword.createMany({
      data: uniqueNames.map((name) => ({ name })),
      skipDuplicates: true,
    });

    // Return the matching keywords
    return this.prisma.keyword.findMany({
      where: {
        name: { in: uniqueNames },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findAll(query: QueryKeywordDto) {
    const where: any = {};
    if (query?.search && query.search.trim()) {
      const term = query.search.trim();
      where.name = { contains: term, mode: 'insensitive' };
    }

    if (query?.all === 'true') {
      const keywords = await this.prisma.keyword.findMany({
        where,
        orderBy: { name: 'asc' },
      });
      return {
        data: keywords,
        total: keywords.length,
      };
    }

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.keyword.count({ where }),
      this.prisma.keyword.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const keyword = await this.prisma.keyword.findUnique({
      where: { keywordId: id },
    });
    if (!keyword) {
      throw new NotFoundException(`Keyword with ID "${id}" not found`);
    }
    return keyword;
  }

  async update(id: string, updateKeywordDto: UpdateKeywordDto) {
    const trimmedName = updateKeywordDto.name.trim();
    if (!trimmedName) {
      throw new BadRequestException('Keyword name cannot be empty');
    }

    await this.findOne(id);

    const existingWithSameName = await this.prisma.keyword.findFirst({
      where: {
        name: trimmedName,
        NOT: { keywordId: id },
      },
    });

    if (existingWithSameName) {
      throw new ConflictException(`Keyword "${trimmedName}" already exists`);
    }

    return this.prisma.keyword.update({
      where: { keywordId: id },
      data: { name: trimmedName },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.keyword.delete({
      where: { keywordId: id },
    });
  }
}
