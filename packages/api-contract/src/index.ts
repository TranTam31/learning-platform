import { initContract } from "@ts-rest/core";
import { authContract } from "./auth.contract";

const c = initContract();

export const contract = c.router(
  {
    auth: authContract,
  },
  {
    pathPrefix: "/api",
    strictStatusCodes: true,
  }
);

export * from "./auth.contract";
