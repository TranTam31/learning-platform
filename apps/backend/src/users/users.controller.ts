import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@repo/api-contract';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @TsRestHandler(contract.users)
  async handler(@Session() session: UserSession) {
    return tsRestHandler(contract.users, {
      findByEmail: async ({ query }) => {
        const user = await this.usersService.findByEmail(query.email);
        return { status: 200, body: user };
      },
    });
  }
}
