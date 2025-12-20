// import { createAuthClient } from "better-auth/react";

// export const authClientWeb = createAuthClient({
//   baseURL: "http://localhost:3000",
//   basePath: "/api/auth",
// });

import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ac, admin, member, owner } from "./plugins/permission";

export type AuthClientOptions = {
  baseURL: string;
  basePath?: string;
};

export function createAppAuthClient(options: AuthClientOptions) {
  return createAuthClient({
    baseURL: options.baseURL,
    basePath: options.basePath ?? "/api/auth",
    plugins: [
      organizationClient({
        ac: ac,
        roles: {
          owner,
          admin,
          member,
        },
      }),
    ],
  });
}
