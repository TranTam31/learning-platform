import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@repo/api-contract';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { MembersService } from './members.service';

@Controller()
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @TsRestHandler(contract.members)
  async handler(@Session() session: UserSession) {
    return tsRestHandler(contract.members, {
      checkUserInOrg: async ({ query }) => {
        const data = await this.membersService.checkUserInOrg(
          session.user.id,
          query.orgId,
          query.orgSlug,
        );
        return { status: 200, body: data };
      },

      addMember: async ({ body }) => {
        try {
          await this.membersService.addMember(
            body.organizationId,
            body.userId,
            body.role as any,
          );
          return { status: 201, body: { success: true as const } };
        } catch (err: any) {
          return { status: 401, body: { error: err.message } };
        }
      },
    });
  }
}
