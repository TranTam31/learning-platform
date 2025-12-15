import { Controller, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { tsRestHandler, TsRestHandler } from '@ts-rest/nest';
import { contract } from '@repo/api-contract';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Get('/test')
  testGet() {
    return 'oke';
  }

  // @TsRestHandler(contract.auth)
  // async handler() {
  //   return tsRestHandler(contract.auth, {
  //     signup: async ({ body }) => {
  //       return {
  //         status: 201,
  //         body: await this.authService.create(body),
  //       };
  //     },
  //     // signin:
  //   });
  // }
}
