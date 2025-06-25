import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-auth.dto';
import { loginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { extractLocalPhoneNumber } from 'src/common/utils/phone.utils';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}
  async register(createUserDto: CreateUserDto) {
    const normalPhoneNumber = await extractLocalPhoneNumber(
      createUserDto.phone_number,
    );
    const findUser = await this.prisma.user.findUnique({
      where: { phone_number: normalPhoneNumber },
    });
    if (findUser)
      throw new ConflictException("User already exist");
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    createUserDto.password = hashedPassword;
    createUserDto.phone_number = normalPhoneNumber;
    const newUser = await this.prisma.user.create({
      data: {
        ...createUserDto,
        is_verified: true,
      },
    });
    return {
      message: 'user created success',
      newUser,
    };
  }
  async login(loginDto: loginUserDto) {
    const normalPhoneNumber = await extractLocalPhoneNumber(
      loginDto.phone_number,
    );
    const findUser = await this.prisma.user.findUnique({
      where: { phone_number: normalPhoneNumber },
    });
    if (!findUser)
      throw new BadRequestException(
        "this phone number is not registered",
      );
    const isMatch = await bcrypt.compare(loginDto.password, findUser.password);
    if (!isMatch) throw new BadRequestException('Password is not right');
    const token = this.jwt.sign({
      id: findUser.id,
      phone_number: findUser.phone_number,
      role: findUser.role,
    });
    return {
      data: { message: 'Welcome to service' },
      token,
    };
  }
}
