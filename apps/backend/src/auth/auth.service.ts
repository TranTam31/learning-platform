import { Injectable } from '@nestjs/common';
import { SignUpInput } from '@repo/api-contract';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: SignUpInput) {
    const { id, avatar, password, ...rest } = await this.prisma.user.create({
      data: {
        fullname: user.fullname,
        email: user.email,
        password: user.password,
      },
    });

    return rest;
  }
}
