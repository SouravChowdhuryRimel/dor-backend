import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateDriverDto } from '../dto/create-driver.dto';
import { UpdateDriverDto } from '../dto/update-driver.dto';
import * as argon2 from 'argon2';

@Injectable()
export class DriverService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDriverDto: CreateDriverDto) {
    const hashedPassword = await argon2.hash(createDriverDto.password);
    return this.prisma.driver.create({
      data: {
        ...createDriverDto,
        password: hashedPassword,
      },
    });
  }

  async findAll() {
    return this.prisma.driver.findMany();
  }

  async findOne(id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId: id },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async update(id: string, updateDriverDto: UpdateDriverDto) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId: id },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const dataToUpdate = { ...updateDriverDto };
    if (dataToUpdate.password) {
      dataToUpdate.password = await argon2.hash(dataToUpdate.password);
    }

    return this.prisma.driver.update({
      where: { driverId: id },
      data: dataToUpdate,
    });
  }

  async remove(id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId: id },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    return this.prisma.driver.delete({ where: { driverId: id } });
  }
}
