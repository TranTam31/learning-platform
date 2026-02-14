import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const classLessonNodesContract = c.router(
  {
    // ── GET /class-lesson-nodes?lessonNodeId=x&classId=y ──
    loadClassLessonNode: {
      method: "GET",
      path: "/",
      query: z.object({
        lessonNodeId: z.string(),
        classId: z.string(),
      }),
      responses: {
        200: c.type<{
          success: boolean;
          data?: Array<{
            id: string;
            type: string;
            content: any;
            createdAt: string;
          }>;
          error?: string;
        }>(),
        401: z.object({ error: z.string() }),
        403: z.object({ error: z.string() }),
      },
      summary: "Load class lesson nodes (role-dependent)",
    },

    // ── POST /class-lesson-nodes/counts ──────────────
    getClassLessonNodeCounts: {
      method: "POST",
      path: "/counts",
      body: z.object({
        lessonNodeIds: z.array(z.string()),
        classId: z.string(),
      }),
      responses: {
        200: c.type<{
          success: boolean;
          data?: Record<string, { lesson_note: number; homework_imp: number }>;
          error?: string;
        }>(),
        401: z.object({ error: z.string() }),
      },
      summary: "Get counts of class lesson nodes per lesson node",
    },

    // ── POST /class-lesson-nodes ─────────────────────
    addClassLessonNode: {
      method: "POST",
      path: "/",
      body: z.object({
        lessonNodeId: z.string(),
        classId: z.string(),
        type: z.enum(["lesson_note", "homework_imp"]),
        content: z.any(),
      }),
      responses: {
        201: c.type<{
          success: boolean;
          data?: { id: string; type: string; content: any; createdAt: string };
          error?: string;
        }>(),
        401: z.object({ error: z.string() }),
      },
      summary: "Create a class lesson node",
    },

    // ── DELETE /class-lesson-nodes/:classLessonNodeId ──
    deleteClassLessonNode: {
      method: "DELETE",
      path: "/:classLessonNodeId",
      pathParams: z.object({
        classLessonNodeId: z.string(),
      }),
      query: z.object({
        classId: z.string(),
      }),
      body: z.never().optional() as any,
      responses: {
        200: c.type<{
          success: boolean;
          data?: { deletedId: string };
          error?: string;
        }>(),
        401: z.object({ error: z.string() }),
      },
      summary: "Delete a class lesson node",
    },

    // ── GET /class-lesson-nodes/:lessonNodeId/build-run ──
    getBuildRunId: {
      method: "GET",
      path: "/:lessonNodeId/build-run",
      pathParams: z.object({
        lessonNodeId: z.string(),
      }),
      responses: {
        200: c.type<{
          widgetId: string | null;
          buildRunId: string | null;
        }>(),
      },
      summary: "Get build run ID from lesson node's widget reference",
    },

    // ── GET /class-lesson-nodes/assignment-stats/:classId ──
    getAssignmentStatsBatch: {
      method: "GET",
      path: "/assignment-stats/:classId",
      pathParams: z.object({
        classId: z.string(),
      }),
      responses: {
        200: c.type<{
          success: boolean;
          data?: Record<
            string,
            { total: number; assigned: number; submitted: number }
          >;
          error?: string;
        }>(),
        401: z.object({ error: z.string() }),
        403: z.object({ error: z.string() }),
      },
      summary:
        "Get assignment stats for all homework CLNs in a class (teacher/owner)",
    },
  },
  { pathPrefix: "/class-lesson-nodes" },
);
