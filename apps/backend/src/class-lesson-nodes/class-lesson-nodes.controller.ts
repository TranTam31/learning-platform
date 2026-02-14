import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@repo/api-contract';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { ClassLessonNodesService } from './class-lesson-nodes.service';

@Controller()
export class ClassLessonNodesController {
  constructor(
    private readonly classLessonNodesService: ClassLessonNodesService,
  ) {}

  @TsRestHandler(contract.classLessonNodes)
  async handler(@Session() session: UserSession) {
    return tsRestHandler(contract.classLessonNodes, {
      loadClassLessonNode: async ({ query }) => {
        const data = await this.classLessonNodesService.loadClassLessonNode(
          query.lessonNodeId,
          query.classId,
          session.user.id,
        );
        return { status: 200, body: data as any };
      },

      getClassLessonNodeCounts: async ({ body }) => {
        const result =
          await this.classLessonNodesService.getClassLessonNodeCounts(
            body.lessonNodeIds,
            body.classId,
            session.user.id,
          );
        return { status: 200, body: result };
      },

      addClassLessonNode: async ({ body }) => {
        const result = await this.classLessonNodesService.addClassLessonNode({
          lessonNodeId: body.lessonNodeId,
          classId: body.classId,
          type: body.type,
          content: body.content ?? {},
        });
        return { status: 201, body: result as any };
      },

      deleteClassLessonNode: async ({ params, query }) => {
        const result = await this.classLessonNodesService.deleteClassLessonNode(
          params.classLessonNodeId,
          query.classId,
        );
        return { status: 200, body: result };
      },

      getBuildRunId: async ({ params }) => {
        const result = await this.classLessonNodesService.getBuildRunId(
          params.lessonNodeId,
        );
        return { status: 200, body: result };
      },

      getAssignmentStatsBatch: async ({ params }) => {
        const result =
          await this.classLessonNodesService.getAssignmentStatsBatch(
            params.classId,
            session.user.id,
          );
        return { status: 200, body: result };
      },
    });
  }
}
