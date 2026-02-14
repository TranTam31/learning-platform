import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@repo/api-contract';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { ClassGroupsService } from './class-groups.service';

@Controller()
export class ClassGroupsController {
  constructor(private readonly classGroupsService: ClassGroupsService) {}

  @TsRestHandler(contract.classGroups)
  async handler(@Session() session: UserSession) {
    return tsRestHandler(contract.classGroups, {
      createClassGroup: async ({ body }) => {
        try {
          const data = await this.classGroupsService.createClassGroup(
            body.classId,
            body.name,
            session.user.id,
            body.description,
          );
          return { status: 201, body: data };
        } catch (err: any) {
          if (err.message === 'Forbidden')
            return { status: 403, body: { error: 'Forbidden' } };
          return { status: 401, body: { error: err.message } };
        }
      },

      updateClassGroup: async ({ params, body }) => {
        try {
          const data = await this.classGroupsService.updateClassGroup(
            body.classId,
            params.groupId,
            body.name,
            session.user.id,
            body.description,
          );
          return { status: 200, body: data };
        } catch (err: any) {
          if (err.message === 'Forbidden')
            return { status: 403, body: { error: 'Forbidden' } };
          return { status: 401, body: { error: err.message } };
        }
      },

      deleteClassGroup: async ({ params, query }) => {
        try {
          await this.classGroupsService.deleteClassGroup(
            query.classId,
            params.groupId,
            session.user.id,
          );
          return { status: 200, body: { success: true as const } };
        } catch (err: any) {
          if (err.message === 'Forbidden')
            return { status: 403, body: { error: 'Forbidden' } };
          return { status: 401, body: { error: err.message } };
        }
      },

      addMemberToGroup: async ({ params, body }) => {
        try {
          const data = await this.classGroupsService.addMemberToGroup(
            body.classId,
            params.groupId,
            body.userId,
            session.user.id,
          );
          return { status: 201, body: data };
        } catch (err: any) {
          if (err.message === 'Forbidden')
            return { status: 403, body: { error: 'Forbidden' } };
          return { status: 401, body: { error: err.message } };
        }
      },

      removeMemberFromGroup: async ({ params, query }) => {
        try {
          await this.classGroupsService.removeMemberFromGroup(
            query.classId,
            params.groupId,
            params.userId,
            session.user.id,
          );
          return { status: 200, body: { success: true as const } };
        } catch (err: any) {
          if (err.message === 'Forbidden')
            return { status: 403, body: { error: 'Forbidden' } };
          return { status: 401, body: { error: err.message } };
        }
      },
    });
  }
}
