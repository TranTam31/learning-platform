import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const membersContract = c.router(
  {
    // ── GET /members/check?orgId=x  or  ?orgSlug=x ──
    checkUserInOrg: {
      method: "GET",
      path: "/check",
      query: z.object({
        orgId: z.string().optional(),
        orgSlug: z.string().optional(),
      }),
      responses: {
        200: c.type<{
          userId: string;
          role: string;
          organization: { id: string; name: string; slug: string | null };
        } | null>(),
        401: z.object({ error: z.string() }),
      },
      summary: "Check if current user belongs to an organization",
    },

    // ── POST /members ─────────────────────────────────
    addMember: {
      method: "POST",
      path: "/",
      body: z.object({
        organizationId: z.string(),
        userId: z.string(),
        role: z.enum(["admin", "member", "owner"]),
      }),
      responses: {
        201: z.object({ success: z.literal(true) }),
        401: z.object({ error: z.string() }),
      },
      summary: "Add a member to an organization",
    },
  },
  { pathPrefix: "/members" },
);
