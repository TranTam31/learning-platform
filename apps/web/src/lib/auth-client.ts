// import { createAuthClient } from "better-auth/react";

// export const authClient = createAuthClient({
//   baseURL: "http://localhost:3000",
//   basePath: "/api/auth",
// });

import { createAppAuthClient } from "@repo/auth/client";

export const authClient = createAppAuthClient({
  baseURL: process.env.BETTER_AUTH_URL!,
});
