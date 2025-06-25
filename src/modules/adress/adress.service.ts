import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { CreateAdressDto } from './dto/create-adress.dto';
import { UpdateAdressDto } from './dto/update-adress.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { userPayload } from 'src/common/interfaces/express-user.interface';

@Injectable()
export class AdressService {
  constructor(private prisma: PrismaService) {}
  async createAdress(user: userPayload, createAdressDto: CreateAdressDto) {
    const findAdress = await this.prisma.address.findUnique({
      where: { userId: user.id },
    });
    if (findAdress)
      throw new ConflictException(
        "You already have your address information",
      );
    const newAdress = await this.prisma.address.create({
      data: { ...createAdressDto, phone: user.phone_number, userId: user.id },
    });
    return {
      message: 'Address created success',
      region: newAdress.region,
      city: newAdress.city,
      street: newAdress.street,
    };
  }
  async getMyAdress(user: userPayload) {
    const findAdress = await this.prisma.address.findUnique({
      where: { userId: user.id },
    });
    if (!findAdress)
      throw new ForbiddenException(
        "You don't have your address information",
      );
    return findAdress;
  }

  async updateAdress(updateAdressDto: UpdateAdressDto, user: userPayload) {
    const newAdress = await this.prisma.address.update({
      where: { userId: user.id },
      data: {
        region: updateAdressDto.new_region,
        city: updateAdressDto.new_city,
        street: updateAdressDto.new_street,
        updatedAt: new Date(),
      },
    });
    return {
      message: 'Address updated success',
      newAdress,
    };
  }
  async deleteMyAdress(user: userPayload) {
    await this.prisma.address.delete({ where: { userId: user.id } });
    return { message: 'Address deleted success' };
  }
}
