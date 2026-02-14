import { Controller, Req } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@repo/api-contract';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { PermissionsService } from './permissions.service';
import type { Request } from 'express';

@Controller()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @TsRestHandler(contract.permissions)
  async handler(@Session() session: UserSession, @Req() req: Request) {
    return tsRestHandler(contract.permissions, {
      isAdmin: async () => {
        const result = await this.permissionsService.isAdmin(req);
        return { status: 200, body: result };
      },
    });
  }
}
