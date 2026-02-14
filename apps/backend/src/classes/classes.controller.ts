import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@repo/api-contract';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { ClassesService } from './classes.service';

@Controller()
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @TsRestHandler(contract.classes)
  async handler(@Session() session: UserSession) {
    return tsRestHandler(contract.classes, {
      getUserClasses: async () => {
        const data = await this.classesService.getUserClasses(session.user.id);
        return { status: 200, body: data };
      },

      getClassWithCourse: async ({ params }) => {
        try {
          const data = await this.classesService.getClassWithCourse(
            params.classId,
            session.user.id,
          );
          return { status: 200, body: data };
        } catch (err: any) {
          if (err.message === 'Forbidden')
            return { status: 403, body: { error: 'Forbidden' } };
          return { status: 401, body: { error: err.message } };
        }
      },

      createClass: async ({ body }) => {
        try {
          const data = await this.classesService.createClass(
            body.name,
            body.courseId,
            body.organizationId,
            session.user.id,
          );
          return { status: 201, body: data };
        } catch (err: any) {
          if (err.message === 'Forbidden')
            return { status: 403, body: { error: 'Forbidden' } };
          return { status: 401, body: { error: err.message } };
        }
      },

      addClassMember: async ({ params, body }) => {
        const data = await this.classesService.addClassMember(
          params.classId,
          body.userId,
          body.role as any,
        );
        return { status: 201, body: data };
      },

      getClassStudents: async ({ params }) => {
        try {
          const data = await this.classesService.getClassStudents(
            params.classId,
            session.user.id,
          );
          return { status: 200, body: data };
        } catch (err: any) {
          if (err.message === 'Forbidden')
            return { status: 403, body: { error: 'Forbidden' } };
          return { status: 401, body: { error: err.message } };
        }
      },

      getStudentPendingAssignments: async ({ params }) => {
        const data = await this.classesService.getStudentPendingAssignments(
          params.classId,
          session.user.id,
        );
        return { status: 200, body: data };
      },

      getPendingAssignmentsBatch: async ({ body }) => {
        const data = await this.classesService.getPendingAssignmentsBatch(
          body.classIds,
          session.user.id,
        );
        return { status: 200, body: data };
      },
    });
  }
}
