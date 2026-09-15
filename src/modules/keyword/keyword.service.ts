import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
    const search = query?.search?.trim();
    const whereSql = search
      ? Prisma.sql`WHERE k.name ILIKE ${'%' + search + '%'}`
      : Prisma.empty;

    const sortBy = query?.sortBy || 'popularity';
    const sortOrder = (
      query?.sortOrder || (sortBy === 'name' ? 'asc' : 'desc')
    ).toLowerCase();

    let orderBySql = Prisma.sql`ORDER BY "popularity" DESC, k.name ASC`;
    if (sortBy === 'name') {
      orderBySql =
        sortOrder === 'desc'
          ? Prisma.sql`ORDER BY k.name DESC`
          : Prisma.sql`ORDER BY k.name ASC`;
    } else if (sortBy === 'createdAt') {
      orderBySql =
        sortOrder === 'asc'
          ? Prisma.sql`ORDER BY k.created_at ASC`
          : Prisma.sql`ORDER BY k.created_at DESC`;
    } else {
      // default: popularity (based on company profile keyword usage counter)
      orderBySql =
        sortOrder === 'asc'
          ? Prisma.sql`ORDER BY "popularity" ASC, k.name ASC`
          : Prisma.sql`ORDER BY "popularity" DESC, k.name ASC`;
    }

    if (query?.all === 'true') {
      const data = await this.prisma.$queryRaw<any[]>`
        SELECT 
          k.keyword_id AS "keywordId",
          k.name,
          k.created_at AS "createdAt",
          k.updated_at AS "updatedAt",
          COALESCE(c.company_count, 0)::int AS "companyCount",
          COALESCE(c.company_count, 0)::int AS "popularity"
        FROM keywords k
        LEFT JOIN (
          SELECT LOWER(TRIM(kw)) AS kw_name, COUNT(DISTINCT company_id)::int AS company_count
          FROM (
            SELECT company_id, unnest(keywords) AS kw
            FROM companies
            WHERE keywords IS NOT NULL AND array_length(keywords, 1) > 0
          ) sub
          WHERE kw IS NOT NULL AND TRIM(kw) <> ''
          GROUP BY LOWER(TRIM(kw))
        ) c ON c.kw_name = LOWER(TRIM(k.name))
        ${whereSql}
        ${orderBySql}
      `;
      return {
        data,
        total: data.length,
      };
    }

    const page = query?.page ? Number(query.page) : 1;
    const limit = query?.limit ? Number(query.limit) : 20;
    const offset = (page - 1) * limit;

    const [totalResult, data] = await Promise.all([
      this.prisma.$queryRaw<[{ count: bigint | number }]>`
        SELECT COUNT(*)::int AS count
        FROM keywords k
        ${whereSql}
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT 
          k.keyword_id AS "keywordId",
          k.name,
          k.created_at AS "createdAt",
          k.updated_at AS "updatedAt",
          COALESCE(c.company_count, 0)::int AS "companyCount",
          COALESCE(c.company_count, 0)::int AS "popularity"
        FROM keywords k
        LEFT JOIN (
          SELECT LOWER(TRIM(kw)) AS kw_name, COUNT(DISTINCT company_id)::int AS company_count
          FROM (
            SELECT company_id, unnest(keywords) AS kw
            FROM companies
            WHERE keywords IS NOT NULL AND array_length(keywords, 1) > 0
          ) sub
          WHERE kw IS NOT NULL AND TRIM(kw) <> ''
          GROUP BY LOWER(TRIM(kw))
        ) c ON c.kw_name = LOWER(TRIM(k.name))
        ${whereSql}
        ${orderBySql}
        LIMIT ${limit} OFFSET ${offset}
      `,
    ]);

    const total = Number(totalResult[0]?.count || 0);
    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const results = await this.prisma.$queryRaw<any[]>`
      SELECT 
        k.keyword_id AS "keywordId",
        k.name,
        k.created_at AS "createdAt",
        k.updated_at AS "updatedAt",
        COALESCE(c.company_count, 0)::int AS "companyCount",
        COALESCE(c.company_count, 0)::int AS "popularity"
      FROM keywords k
      LEFT JOIN (
        SELECT LOWER(TRIM(kw)) AS kw_name, COUNT(DISTINCT company_id)::int AS company_count
        FROM (
          SELECT company_id, unnest(keywords) AS kw
          FROM companies
          WHERE keywords IS NOT NULL AND array_length(keywords, 1) > 0
        ) sub
        WHERE kw IS NOT NULL AND TRIM(kw) <> ''
        GROUP BY LOWER(TRIM(kw))
      ) c ON c.kw_name = LOWER(TRIM(k.name))
      WHERE k.keyword_id = ${id}
      LIMIT 1
    `;
    if (!results || results.length === 0) {
      throw new NotFoundException(`Keyword with ID "${id}" not found`);
    }
    return results[0];
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
