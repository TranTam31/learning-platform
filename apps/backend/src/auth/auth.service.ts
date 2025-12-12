import { Injectable } from '@nestjs/common';
import { SignUpInput } from '@repo/api-contract';

@Injectable()
export class AuthService {
  users: SignUpInput[] = [];

  create(user: SignUpInput) {
    const newUser: SignUpInput = {
      ...user,
    };
    this.users.push(newUser);
    console.log(user);
    return newUser;
  }
}
