import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const classesContract = c.router(
  {
    // ── GET /classes ─────────────────────────────────
    getUserClasses: {
      method: "GET",
      path: "/",
      responses: {
        200: c.type<{
          owner: Array<any>;
          teacher: Array<any>;
          student: Array<any>;
        }>(),
        401: z.object({ error: z.string() }),
      },
      summary: "Get current user's classes grouped by role",
    },

    // ── GET /classes/:classId ────────────────────────
    getClassWithCourse: {
      method: "GET",
      path: "/:classId",
      pathParams: z.object({
        classId: z.string(),
      }),
      responses: {
        200: c.type<{
          success: boolean;
          data: { classData: any; nodes: any[] };
          role: string;
        }>(),
        401: z.object({ error: z.string() }),
        403: z.object({ error: z.string() }),
      },
      summary: "Get class with course data and nodes",
    },

    // ── POST /classes ────────────────────────────────
    createClass: {
      method: "POST",
      path: "/",
      body: z.object({
        name: z.string().min(1),
        courseId: z.string(),
        organizationId: z.string(),
      }),
      responses: {
        201: c.type<any>(),
        401: z.object({ error: z.string() }),
        403: z.object({ error: z.string() }),
      },
      summary: "Create a new class",
    },

    // ── POST /classes/:classId/members ───────────────
    addClassMember: {
      method: "POST",
      path: "/:classId/members",
      pathParams: z.object({
        classId: z.string(),
      }),
      body: z.object({
        userId: z.string(),
        role: z.enum(["owner", "teacher", "student"]),
      }),
      responses: {
        201: c.type<any>(),
        401: z.object({ error: z.string() }),
      },
      summary: "Add a member to a class",
    },

    // ── GET /classes/:classId/students ────────────────
    getClassStudents: {
      method: "GET",
      path: "/:classId/students",
      pathParams: z.object({
        classId: z.string(),
      }),
      responses: {
        200: c.type<
          Array<{
            id: string;
            name: string;
            email: string;
            image: string | null;
          }>
        >(),
        401: z.object({ error: z.string() }),
        403: z.object({ error: z.string() }),
      },
      summary: "Get all students in a class (teacher/owner only)",
    },

    // ── GET /classes/:classId/pending-assignments ────
    getStudentPendingAssignments: {
      method: "GET",
      path: "/:classId/pending-assignments",
      pathParams: z.object({
        classId: z.string(),
      }),
      responses: {
        200: c.type<{
          success: boolean;
          data?: { pending: number; total: number };
          error?: string;
        }>(),
        401: z.object({ error: z.string() }),
      },
      summary: "Get student's pending assignment count in a class",
    },

    // ── POST /classes/pending-assignments-batch ──────
    getPendingAssignmentsBatch: {
      method: "POST",
      path: "/pending-assignments-batch",
      body: z.object({
        classIds: z.array(z.string()),
      }),
      responses: {
        200: c.type<{
          success: boolean;
          data?: Record<string, { pending: number; total: number }>;
          error?: string;
        }>(),
        401: z.object({ error: z.string() }),
      },
      summary: "Get pending assignments count for multiple classes (batch)",
    },
  },
  { pathPrefix: "/classes" },
);
