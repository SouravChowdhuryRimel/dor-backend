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
