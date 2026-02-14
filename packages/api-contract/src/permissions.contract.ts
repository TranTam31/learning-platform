import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const permissionsContract = c.router(
  {
    // ── GET /permissions/is-admin ─────────────────────
    isAdmin: {
      method: "GET",
      path: "/is-admin",
      responses: {
        200: c.type<boolean | { success: boolean; error?: any }>(),
        401: z.object({ error: z.string() }),
      },
      summary: "Check if current user is an admin",
    },
  },
  { pathPrefix: "/permissions" },
);
