import { contract } from "@repo/api-contract";
import { initClient } from "@ts-rest/core";
import { headers as getHeaders } from "next/headers";

/**
 * ts-rest client cho Server Components / Server Actions (plain fetch).
 *
 * Tự động forward cookies từ request hiện tại → better-auth hoạt động.
 *
 * Sử dụng trong Server Component:
 *   const { status, body } = await apiServer.health.check();
 *
 * `baseUrl` phải là URL tuyệt đối vì server-side fetch không có origin.
 *   - Development → http://localhost:3000  (Next.js)
 *   - Production  → đặt INTERNAL_API_URL trong env
 *   - NestJS      → đặt INTERNAL_API_URL=http://localhost:3001
 */
export const apiServer = initClient(contract, {
  baseUrl: process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_APP_URL!,
  baseHeaders: {},
  api: async (args) => {
    // Forward cookies from the incoming request so auth works
    const reqHeaders = await getHeaders();
    const cookie = reqHeaders.get("cookie") ?? "";

    const res = await fetch(args.path, {
      method: args.method,
      headers: {
        "content-type": "application/json",
        cookie,
        ...args.headers,
      },
      body: args.body ? JSON.stringify(args.body) : undefined,
    });

    return {
      status: res.status,
      body: await res.json(),
      headers: res.headers,
    };
  },
});
