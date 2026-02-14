import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { classesContract } from "./classes.contract";
import { coursesContract } from "./courses.contract";
import { classLessonNodesContract } from "./class-lesson-nodes.contract";
import { classGroupsContract } from "./class-groups.contract";
import { membersContract } from "./members.contract";
import { usersContract } from "./users.contract";
import { widgetsContract } from "./widgets.contract";
import { permissionsContract } from "./permissions.contract";

const c = initContract();

// ── Health check ───────────────────────────────────────────
const healthContract = c.router({
  check: {
    method: "GET",
    path: "/health",
    responses: {
      200: z.object({
        status: z.literal("ok"),
        timestamp: z.string(),
      }),
    },
    summary: "Health check",
  },
});

// ── Root router ────────────────────────────────────────────
export const contract = c.router(
  {
    health: healthContract,
    classes: classesContract,
    courses: coursesContract,
    classLessonNodes: classLessonNodesContract,
    classGroups: classGroupsContract,
    members: membersContract,
    users: usersContract,
    widgets: widgetsContract,
    permissions: permissionsContract,
  },
  {
    pathPrefix: "/api",
    strictStatusCodes: true,
  },
);

// Re-export shared schemas & types (not contracts)
export * from "./schemas";
