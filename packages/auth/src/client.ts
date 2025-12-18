// import { createAuthClient } from "better-auth/react";

// export const authClientWeb = createAuthClient({
//   baseURL: "http://localhost:3000",
//   basePath: "/api/auth",
// });

import { createAuthClient } from "better-auth/react";

export type AuthClientOptions = {
  baseURL: string;
  basePath?: string;
};

export function createAppAuthClient(options: AuthClientOptions) {
  return createAuthClient({
    baseURL: options.baseURL,
    basePath: options.basePath ?? "/api/auth",
  });
}
