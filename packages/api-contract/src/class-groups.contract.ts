import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const classGroupsContract = c.router(
  {
    // ── POST /class-groups ───────────────────────────
    createClassGroup: {
      method: "POST",
      path: "/",
      body: z.object({
        classId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
      }),
      responses: {
        201: c.type<any>(),
        401: z.object({ error: z.string() }),
        403: z.object({ error: z.string() }),
      },
      summary: "Create a class group (teacher/owner only)",
    },

    // ── PATCH /class-groups/:groupId ──────────────────
    updateClassGroup: {
      method: "PATCH",
      path: "/:groupId",
      pathParams: z.object({
        groupId: z.string(),
      }),
      body: z.object({
        classId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
      }),
      responses: {
        200: c.type<any>(),
        401: z.object({ error: z.string() }),
        403: z.object({ error: z.string() }),
      },
      summary: "Update a class group (teacher/owner only)",
    },

    // ── DELETE /class-groups/:groupId ─────────────────
    deleteClassGroup: {
      method: "DELETE",
      path: "/:groupId",
      pathParams: z.object({
        groupId: z.string(),
      }),
      query: z.object({
        classId: z.string(),
      }),
      body: z.never().optional() as any,
      responses: {
        200: z.object({ success: z.literal(true) }),
        401: z.object({ error: z.string() }),
        403: z.object({ error: z.string() }),
      },
      summary: "Delete a class group (teacher/owner only)",
    },

    // ── POST /class-groups/:groupId/members ───────────
    addMemberToGroup: {
      method: "POST",
      path: "/:groupId/members",
      pathParams: z.object({
        groupId: z.string(),
      }),
      body: z.object({
        classId: z.string(),
        userId: z.string(),
      }),
      responses: {
        201: c.type<any>(),
        401: z.object({ error: z.string() }),
        403: z.object({ error: z.string() }),
      },
      summary: "Add a member to a class group",
    },

    // ── DELETE /class-groups/:groupId/members/:userId ──
    removeMemberFromGroup: {
      method: "DELETE",
      path: "/:groupId/members/:userId",
      pathParams: z.object({
        groupId: z.string(),
        userId: z.string(),
      }),
      query: z.object({
        classId: z.string(),
      }),
      body: z.never().optional() as any,
      responses: {
        200: z.object({ success: z.literal(true) }),
        401: z.object({ error: z.string() }),
        403: z.object({ error: z.string() }),
      },
      summary: "Remove a member from a class group",
    },
  },
  { pathPrefix: "/class-groups" },
);
