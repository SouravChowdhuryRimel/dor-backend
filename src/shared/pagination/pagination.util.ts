import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export interface PaginationResult<T> {
  data: T[];
  meta: {
    total: number;
    lastId?: string | number;
    hasNextPage: boolean;
  };
}

export interface CursorPaginationDto {
  limit?: number;
  cursor?: string;
  orderBy?: string;
  order?: 'asc' | 'desc';
}

export const getPaginationMeta = <T>(
  data: T[],
  limit: number,
  total: number,
  idField: keyof T = 'id' as keyof T,
): PaginationResult<T>['meta'] => {
  const hasNextPage = data.length > limit;
  const items = hasNextPage ? data.slice(0, limit) : data;
  const lastItem = items[items.length - 1];

  return {
    total,
    lastId: lastItem ? (lastItem[idField] as any) : undefined,
    hasNextPage,
  };
};

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: totalPages || 1,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
