import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const usersContract = c.router(
  {
    // ── GET /users/search?email=xxx ──────────────────
    findByEmail: {
      method: "GET",
      path: "/search",
      query: z.object({
        email: z.string().email(),
      }),
      responses: {
        200: c.type<{
          id: string;
          name: string;
          email: string;
          image: string | null;
        } | null>(),
      },
      summary: "Find a user by email",
    },
  },
  { pathPrefix: "/users" },
);
