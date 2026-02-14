import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const widgetsContract = c.router(
  {
    // ── GET /widgets ─────────────────────────────────
    getAllWidgets: {
      method: "GET",
      path: "/",
      responses: {
        200: c.type<any[]>(),
      },
      summary: "Get all widgets",
    },
  },
  { pathPrefix: "/widgets" },
);
