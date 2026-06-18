import { PrismaService } from './database.service';

type PrismaDelegate = any;

export abstract class BaseRepository<T> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly model: string,
  ) {}

  /** Returns the Prisma delegate for the configured model. */
  private get delegate(): PrismaDelegate {
    return (this.prisma as any)[this.model];
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    cursor?: any;
    where?: any;
    orderBy?: any;
  }): Promise<T[]> {
    return this.delegate.findMany(params);
  }

  async findOne(where: any): Promise<T | null> {
    return this.delegate.findUnique({ where });
  }

  async findFirst(where: any): Promise<T | null> {
    return this.delegate.findFirst({ where });
  }

  async create(data: any): Promise<T> {
    return this.delegate.create({ data });
  }

  async update(where: any, data: any): Promise<T> {
    return this.delegate.update({ where, data });
  }

  async delete(where: any): Promise<T> {
    return this.delegate.delete({ where });
  }

  async count(where?: any): Promise<number> {
    return this.delegate.count({ where });
  }
}
